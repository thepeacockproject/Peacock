/*
 *     The Peacock Project - a HITMAN server replacement.
 *     Copyright (C) 2021-2023 The Peacock Project Team
 *
 *     This program is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU Affero General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     (at your option) any later version.
 *
 *     This program is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU Affero General Public License for more details.
 *
 *     You should have received a copy of the GNU Affero General Public License
 *     along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Router } from "express"
import path from "path"
import {
    castUserProfile,
    getMaxProfileLevel,
    LATEST_PROFILE_VERSION,
    nilUuid,
    uuidRegex,
    XP_PER_LEVEL,
} from "./utils"
import { json as jsonMiddleware } from "body-parser"
import { getPlatformEntitlements } from "./platformEntitlements"
import { contractSessions, newSession } from "./eventHandler"
import type {
    CompiledChallengeIngameData,
    ContractSession,
    GameVersion,
    RequestWithJwt,
    SaveFile,
    UpdateUserSaveFileTableBody,
    UserProfile,
} from "./types/types"
import { log, LogLevel } from "./loggingInterop"
import {
    deleteContractSession,
    getContractSession,
    getUserData,
    writeContractSession,
    writeUserData,
} from "./databaseHandler"
import { randomUUID } from "crypto"
import { getVersionedConfig } from "./configSwizzleManager"
import { createInventory } from "./inventory"
import { controller } from "./controller"
import { loadouts } from "./loadouts"
import { getFlag } from "./flags"
import { menuSystemDatabase } from "./menus/menuSystem"
import {
    compileRuntimeChallenge,
    inclusionDataCheck,
} from "./candle/challengeHelpers"
import { LoadSaveBody } from "./types/gameSchemas"

const profileRouter = Router()

// /authentication/api/userchannel/

export interface FakePlayer {
    id: string
    name: string
    platformId: string
    platform: string
}

/**
 * The fake player registry allows us to translate another user's
 * profile ID to their name, for leaderboards.
 */
export const fakePlayerRegistry: {
    players: FakePlayer[]
    getFromId(id: string): FakePlayer | undefined
    index(
        name: string,
        platform: string,
        platformId: string,
        requestedId?: string,
    ): string
} = {
    players: [],
    getFromId(id: string): FakePlayer | undefined {
        return this.players.find((p) => p.id === id)
    },
    index(
        name: string,
        platform: string,
        platformId: string,
        requestedId?: string,
    ): string {
        if (!this.players.find((p) => p.name === name)) {
            this.players.push({
                name,
                id: requestedId || randomUUID(),
                platformId,
                platform,
            })
        }

        return this.players.find((p) => p.name === name)?.id || nilUuid
    },
}

profileRouter.post(
    "/AuthenticationService/GetBlobOfflineCacheDatabaseDiff",
    (req: RequestWithJwt, res) => {
        const configs = []

        menuSystemDatabase.hooks.getDatabaseDiff.call(configs, req.gameVersion)

        res.json(configs)
    },
)

profileRouter.post("/ProfileService/SetClientEntitlements", (req, res) => {
    res.json("null")
})

profileRouter.post(
    "/ProfileService/GetPlatformEntitlements",
    jsonMiddleware(),
    getPlatformEntitlements,
)

profileRouter.post(
    "/ProfileService/UpdateProfileStats",
    jsonMiddleware(),
    (req: RequestWithJwt, res) => {
        if (req.jwt.unique_name !== req.body.id) {
            return res.status(403).end() // data submitted for different profile id
        }

        const userdata = getUserData(req.jwt.unique_name, req.gameVersion)

        userdata.Gamertag = req.body.gamerTag
        userdata.Extensions.achievements = req.body.achievements

        writeUserData(req.jwt.unique_name, req.gameVersion)
        res.status(204).end()
    },
)

profileRouter.post(
    "/ProfileService/SynchronizeOfflineUnlockables",
    (req, res) => {
        res.status(204).end()
    },
)

profileRouter.post("/ProfileService/GetUserConfig", (req, res) => {
    res.json({})
})

profileRouter.post(
    "/ProfileService/GetProfile",
    jsonMiddleware(),
    (req: RequestWithJwt, res) => {
        if (req.body.id !== req.jwt.unique_name) {
            res.status(403).end() // data requested for different profile id
            log(
                LogLevel.WARN,
                `Profile request mismatch (malicious?) - issuer: ${req.jwt.unique_name} victim: ${req.body.id}`,
            )
            return
        }

        const userdata = getUserData(req.jwt.unique_name, req.gameVersion)

        for (const extension in userdata.Extensions) {
            if (
                Object.hasOwn(userdata.Extensions, extension) &&
                !Object.hasOwn(req.body.extensions, extension)
            ) {
                delete userdata[extension]
            }
        }

        res.json(userdata)
    },
)

profileRouter.post(
    "/UnlockableService/GetInventory",
    (req: RequestWithJwt, res) => {
        res.json(createInventory(req.jwt.unique_name, req.gameVersion))
    },
)

profileRouter.post(
    "/ProfileService/UpdateExtensions",
    jsonMiddleware(),
    (
        req: RequestWithJwt<
            Record<string, never>,
            { extensionsData: Record<string, unknown>; id: string }
        >,
        res,
    ) => {
        if (req.body.id !== req.jwt.unique_name) {
            // data requested for different profile id
            res.status(403).end()
            return
        }

        const userdata = getUserData(req.jwt.unique_name, req.gameVersion)

        for (const extension in req.body.extensionsData) {
            if (
                Object.prototype.hasOwnProperty.call(
                    req.body.extensionsData,
                    extension,
                )
            ) {
                userdata.Extensions[extension] =
                    req.body.extensionsData[extension]
            }
        }

        writeUserData(req.jwt.unique_name, req.gameVersion)
        res.json(req.body.extensionsData)
    },
)

profileRouter.post(
    "/ProfileService/SynchroniseGameStats",
    jsonMiddleware(),
    (req: RequestWithJwt, res) => {
        if (req.body.profileId !== req.jwt.unique_name) {
            // data requested for different profile id
            res.status(403).end()
            return
        }

        const userdata = getUserData(req.jwt.unique_name, req.gameVersion)

        userdata.Extensions.gamepersistentdata.__stats = req.body.localStats

        writeUserData(req.jwt.unique_name, req.gameVersion)

        res.json({
            Inventory: createInventory(req.jwt.unique_name, req.gameVersion),
            Stats: req.body.localStats,
        })
    },
)

export async function resolveProfiles(
    profileIDs: string[],
    gameVersion: GameVersion,
): Promise<UserProfile[]> {
    // cast to non-undefined value
    return <UserProfile[]>(
        await Promise.allSettled(
            profileIDs.map((id: string) => {
                if (!uuidRegex.test(id)) {
                    return Promise.reject(
                        "Tried to resolve malformed profile id",
                    )
                }

                if (id === "fadb923c-e6bb-4283-a537-eb4d1150262e") {
                    // ioi dev account
                    return Promise.resolve({
                        Id: "fadb923c-e6bb-4283-a537-eb4d1150262e",
                        LinkedAccounts: {
                            dev: "IOI",
                        },
                        Extensions: {},
                        ETag: null,
                        Gamertag: null,
                        DevId: "IOI",
                        SteamId: null,
                        StadiaId: null,
                        EpicId: null,
                        NintendoId: null,
                        XboxLiveId: null,
                        PSNAccountId: null,
                        PSNOnlineId: null,
                        Version: LATEST_PROFILE_VERSION,
                    })
                }

                if (id === "a38faeaa-5b5b-4d7e-af90-329e98a26652") {
                    log(
                        LogLevel.WARN,
                        "The game tried to resolve the PeacockProject account, which should no longer be used!",
                    )

                    return Promise.resolve({
                        Id: "a38faeaa-5b5b-4d7e-af90-329e98a26652",
                        LinkedAccounts: {
                            dev: "PeacockProject",
                        },
                        Extensions: {},
                        ETag: null,
                        Gamertag: "PeacockProject",
                        DevId: "PeacockProject",
                        SteamId: null,
                        StadiaId: null,
                        EpicId: null,
                        NintendoId: null,
                        XboxLiveId: null,
                        PSNAccountId: null,
                        PSNOnlineId: null,
                        Version: LATEST_PROFILE_VERSION,
                    })
                }

                const fakePlayer = fakePlayerRegistry.getFromId(id)

                if (fakePlayer) {
                    return Promise.resolve({
                        Id: id,
                        LinkedAccounts:
                            fakePlayer.platform === "epic"
                                ? { epic: fakePlayer.platformId }
                                : { steam: fakePlayer.platformId },
                        Extensions: {},
                        ETag: null,
                        Gamertag: fakePlayer.name,
                        DevId: null,
                        SteamId:
                            fakePlayer.platform === "steam"
                                ? fakePlayer.platformId
                                : null,
                        StadiaId: null,
                        EpicId:
                            fakePlayer.platform === "epic"
                                ? fakePlayer.platformId
                                : null,
                        NintendoId: null,
                        XboxLiveId: null,
                        PSNAccountId: null,
                        PSNOnlineId: null,
                        Version: LATEST_PROFILE_VERSION,
                    })
                }

                try {
                    const p = getUserData(id, gameVersion)

                    if (p) return Promise.resolve(p)

                    return Promise.reject("No value")
                } catch (e) {
                    return Promise.reject(e)
                }
            }),
        )
    )
        .map((outcome: PromiseSettledResult<UserProfile>) => {
            if (outcome.status !== "fulfilled") {
                if (outcome.reason.code === "ENOENT") {
                    log(
                        LogLevel.ERROR,
                        `No such profile ${path.basename(
                            outcome.reason.path,
                            ".json",
                        )}`,
                    )
                }

                return undefined
            }

            const fakeIds = [
                "fadb923c-e6bb-4283-a537-eb4d1150262e",
                "a38faeaa-5b5b-4d7e-af90-329e98a26652",
                ...fakePlayerRegistry.players.map((p) => p.id),
            ]

            let userdata: UserProfile = outcome.value

            if (!fakeIds.includes(outcome?.value?.Id)) {
                userdata = castUserProfile(outcome.value, gameVersion)
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            userdata.Extensions = {} as any
            return userdata
        })
        .filter(Boolean) // filter out nulls
}

profileRouter.post(
    "/ProfileService/ResolveProfiles",
    jsonMiddleware(),
    async (req: RequestWithJwt, res) => {
        res.json(await resolveProfiles(req.body.profileIDs, req.gameVersion))
    },
)

profileRouter.post(
    "/ProfileService/ResolveGamerTags",
    jsonMiddleware(),
    async (req: RequestWithJwt, res) => {
        const profiles = (await resolveProfiles(
            req.body.profileIds,
            req.gameVersion,
        )) as UserProfile[]

        const result = {
            steam: {},
            epic: {},
            dev: {},
        }

        for (const profile of profiles) {
            if (profile.LinkedAccounts.dev) {
                result.dev[profile.Id] = ""
                continue
            }

            if (profile.Gamertag) {
                if (profile.EpicId) {
                    result.epic[profile.Id] = profile.Gamertag
                    continue
                }

                result.steam[profile.Id] = profile.Gamertag
            }
        }

        res.json(result)
    },
)

profileRouter.post("/ProfileService/GetFriendsCount", (req, res) =>
    res.send("0"),
)

profileRouter.post(
    "/GamePersistentDataService/GetData",
    jsonMiddleware(),
    (req: RequestWithJwt, res) => {
        if (req.jwt.unique_name !== req.body.userId) {
            return res.status(403).end()
        }

        const userdata = getUserData(req.body.userId, req.gameVersion)
        res.json(userdata.Extensions.gamepersistentdata[req.body.key])
    },
)

profileRouter.post(
    "/GamePersistentDataService/SaveData",
    jsonMiddleware(),
    (req: RequestWithJwt, res) => {
        if (req.jwt.unique_name !== req.body.userId) {
            return res.status(403).end()
        }

        const userdata = getUserData(req.body.userId, req.gameVersion)

        userdata.Extensions.gamepersistentdata[req.body.key] = req.body.data
        writeUserData(req.body.userId, req.gameVersion)

        res.json(null)
    },
)

profileRouter.post(
    "/ChallengesService/GetActiveChallengesAndProgression",
    jsonMiddleware(),
    (
        req: RequestWithJwt<
            Record<string, never>,
            { contractId: string; difficultyLevel: number }
        >,
        res,
    ) => {
        if (!uuidRegex.test(req.body.contractId)) {
            return res.status(404).send("invalid contract")
        }

        const json = controller.resolveContract(req.body.contractId, true)

        if (!json) {
            log(
                LogLevel.ERROR,
                `Unknown contract in GACP: ${req.body.contractId}`,
            )
            return res.status(404).send("contract not found")
        }

        if (json.Metadata.Type === "creation") {
            return res.json([])
        }

        let challenges = getVersionedConfig<CompiledChallengeIngameData[]>(
            "GlobalChallenges",
            req.gameVersion,
            true,
        )
            .filter((val) => inclusionDataCheck(val.InclusionData, json))
            .map((item) => ({ Challenge: item, Progression: undefined }))

        challenges.push(
            ...Object.values(
                controller.challengeService.getChallengesForContract(
                    json.Metadata.Id,
                    req.gameVersion,
                    req.jwt.unique_name,
                    req.body.difficultyLevel,
                ),
            )
                .flat()
                .map((challengeData) => {
                    return compileRuntimeChallenge(
                        challengeData,
                        controller.challengeService.getPersistentChallengeProgression(
                            req.jwt.unique_name,
                            challengeData.Id,
                            req.gameVersion,
                        ),
                    )
                }),
        )

        if (json.Metadata.AllowNonTargetKills) {
            challenges = challenges.filter(
                (c) =>
                    c.Challenge.Id !== "f929efad-5d5e-4fcb-9c4e-6eb61a01412c",
            )

            challenges.forEach((val) => {
                // prettier-ignore
                if (val.Challenge.Id === "b1a85feb-55af-4707-8271-b3522661c0b1") {
                    // prettier-ignore
                    val.Challenge.Definition!["States"]["Start"][
                        "CrowdNPC_Died"
                        ]["Transition"] = "Success"
                }
            })
        }

        const unlockAllShortcuts = getFlag("gameplayUnlockAllShortcuts")

        for (const challenge of challenges) {
            if (
                unlockAllShortcuts &&
                challenge.Challenge.Tags?.includes("shortcut")
            ) {
                challenge.Progression = {
                    ChallengeId: challenge.Challenge.Id,
                    ProfileId: req.jwt.unique_name,
                    Completed: true,
                    Ticked: true,
                    State: {
                        CurrentState: "Success",
                    },
                    // @ts-expect-error typescript hates dates
                    CompletedAt: new Date(new Date() - 10).toISOString(),
                    MustBeSaved: false,
                }
            } else {
                challenge.Progression = Object.assign(
                    {
                        ChallengeId: challenge.Challenge.Id,
                        ProfileId: req.jwt.unique_name,
                        Completed: false,
                        State: {},
                        ETag: `W/"datetime'${encodeURIComponent(
                            new Date().toISOString(),
                        )}'"`,
                        CompletedAt: null,
                        MustBeSaved: false,
                    },
                    challenge.Progression,
                )
            }
        }

        res.json(challenges)
    },
)

profileRouter.post(
    "/HubPagesService/GetChallengeTreeFor",
    jsonMiddleware(),
    (req: RequestWithJwt, res) => {
        res.json({
            Data: {
                Children:
                    controller.challengeService.getChallengeTreeForContract(
                        req.body.contractId,
                        req.gameVersion,
                        req.jwt.unique_name,
                        req.body.difficultyLevel,
                    ),
            },
            LevelsDefinition: {
                // TODO: Add Evergreen LevelInfo here?
                Location: [0],
                PlayerProfile: {
                    Version: 1,
                    XpPerLevel: XP_PER_LEVEL,
                    MaxLevel: getMaxProfileLevel(req.gameVersion),
                },
            },
        })
    },
)

profileRouter.post(
    "/DefaultLoadoutService/Set",
    jsonMiddleware(),
    async (req: RequestWithJwt, res) => {
        if (getFlag("loadoutSaving") === "PROFILES") {
            let loadout = loadouts.getLoadoutFor(req.gameVersion)

            if (!loadout) {
                loadout = loadouts.createDefault(req.gameVersion)
            }

            loadout.data[req.body.location] = req.body.loadout

            await loadouts.save()
        } else {
            const userdata = getUserData(req.jwt.unique_name, req.gameVersion)

            if (userdata.Extensions.defaultloadout === undefined) {
                userdata.Extensions.defaultloadout = {}
            }

            userdata.Extensions.defaultloadout[req.body.location] =
                req.body.loadout

            writeUserData(req.jwt.unique_name, req.gameVersion)
        }

        res.status(204).end()
    },
)

profileRouter.post(
    "/ProfileService/UpdateUserSaveFileTable",
    jsonMiddleware(),
    async (req: RequestWithJwt<never, UpdateUserSaveFileTableBody>, res) => {
        if (req.body.clientSaveFileList.length > 0) {
            // We are saving to the SaveFile with the most recent timestamp.
            // Others are ignored.
            const save: SaveFile = req.body.clientSaveFileList.reduce(
                (prev: SaveFile, current: SaveFile) =>
                    prev.TimeStamp > current.TimeStamp ? prev : current,
            )
            const userData = getUserData(req.jwt.unique_name, req.gameVersion)

            try {
                await saveSession(save, userData)

                // Successfully saved, so edit user data
                if (!userData.Extensions.Saves) {
                    userData.Extensions.Saves = {}
                }

                userData.Extensions.Saves[save.Value.Name] = {
                    Timestamp: save.TimeStamp,
                    ContractSessionId: save.ContractSessionId,
                    Token: save.Value.LastEventToken,
                }
                writeUserData(req.jwt.unique_name, req.gameVersion)
            } catch (e) {
                if (getErrorCause(e) === "cause uninvestigated") {
                    log(LogLevel.DEBUG, `${getErrorMessage(e)}`)
                } else {
                    log(
                        LogLevel.WARN,
                        `Unable to save session ${
                            save?.ContractSessionId
                        } because ${getErrorMessage(e)}.`,
                    )
                }
            }
        }

        res.status(204).end()
    },
)

function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message
    return String(error)
}

function getErrorCause(error: unknown) {
    if (error instanceof Error) return error.cause
    return String(error)
}

async function saveSession(
    save: SaveFile,
    userData: UserProfile,
): Promise<void> {
    const sessionId = save.ContractSessionId
    const token = save.Value.LastEventToken
    const slot = save.Value.Name

    if (!contractSessions.has(sessionId)) {
        throw new Error("the session does not exist in the server's memory", {
            cause: "non-existent",
        })
    }

    if (!userData.Extensions.Saves) {
        userData.Extensions.Saves = {}
    }

    if (slot in userData.Extensions.Saves) {
        const delta = save.TimeStamp - userData.Extensions.Saves[slot].Timestamp

        if (delta === 0) {
            throw new Error(
                `the client is accessing /ProfileService/UpdateUserSaveFileTable with nothing updated.`,
                { cause: "cause uninvestigated" },
            )
        } else if (delta < 0) {
            throw new Error(`there is a newer save in slot ${slot}`, {
                cause: "outdated",
            })
        } else {
            // If we can delete the old save, then do it. If not, we can still proceed.
            try {
                await deleteContractSession(
                    slot +
                        "_" +
                        userData.Extensions.Saves[slot].Token +
                        "_" +
                        userData.Extensions.Saves[slot].ContractSessionId,
                )
            } catch (e) {
                log(
                    LogLevel.DEBUG,
                    `Failed to delete old ${slot} save. ${getErrorMessage(e)}.`,
                )
            }
        }
    }

    await writeContractSession(
        slot + "_" + token + "_" + sessionId,
        contractSessions.get(sessionId)!,
    )
    log(
        LogLevel.DEBUG,
        `Saved contract to slot ${slot} with token = ${token}, session id = ${sessionId}, start time = ${
            contractSessions.get(sessionId).timerStart
        }.`,
    )
}

profileRouter.post(
    "/ContractSessionsService/Load",
    jsonMiddleware(),
    async (req: RequestWithJwt<never, LoadSaveBody>, res) => {
        const userData = getUserData(req.jwt.unique_name, req.gameVersion)

        if (
            !req.body.contractSessionId ||
            !req.body.saveToken ||
            !req.body.contractId
        ) {
            res.status(400).send("bad body")
            return
        }

        try {
            await loadSession(
                req.body.contractSessionId,
                req.body.saveToken,
                userData,
            )
        } catch (e) {
            log(
                LogLevel.DEBUG,
                `Failed to load contract with token = ${req.body.saveToken}, session id = ${req.body.contractSessionId} because ${e.message}`,
            )
            log(
                LogLevel.WARN,
                "No such save detected! Might be an official servers save.",
            )

            if (PEACOCK_DEV) {
                log(
                    LogLevel.DEBUG,
                    `(Save-context: ${req.body.contractSessionId}; ${req.body.saveToken})`,
                )
            }

            log(
                LogLevel.WARN,
                "Creating a fake session to avoid problems... scoring will not work!",
            )

            newSession(
                req.body.contractSessionId,
                req.body.contractId,
                req.jwt.unique_name,
                req.body.difficultyLevel!,
                req.gameVersion,
                false,
            )
        }

        res.send(`"${req.body.contractSessionId}"`)
    },
)

async function loadSession(
    sessionId: string,
    token: string,
    userData: UserProfile,
    sessionData?: ContractSession,
): Promise<void> {
    if (!sessionData) {
        try {
            // First, try the loading the session from the filesystem.
            sessionData = await getContractSession(token + "_" + sessionId)
        } catch (e) {
            // Otherwise, see if we still have this session in memory.
            // This may be the currently active session, but we need a fallback of some sorts in case a player disconnected.
            if (contractSessions.has(sessionId)) {
                sessionData = contractSessions.get(sessionId)
            } else {
                // Rethrow the error
                throw e
            }
        }
    }

    // Update challenge progression with the user's latest progression data
    for (const cid in sessionData.challengeContexts) {
        // Make sure the ChallengeProgression is available, otherwise loading might fail!
        userData.Extensions.ChallengeProgression[cid] ??= {
            CurrentState: "Start",
            State: {},
            Completed: false,
            Ticked: false,
        }

        const challenge = controller.challengeService.getChallengeById(
            cid,
            sessionData.gameVersion,
        )

        if (
            !userData.Extensions.ChallengeProgression[cid].Completed &&
            controller.challengeService.needSaveProgression(challenge)
        ) {
            sessionData.challengeContexts[cid].context =
                userData.Extensions.ChallengeProgression[cid].State
        }
    }

    contractSessions.set(sessionId, sessionData)
    log(
        LogLevel.DEBUG,
        `Loaded contract with token = ${token}, session id = ${sessionId}, start time = ${
            contractSessions.get(sessionId).timerStart
        }.`,
    )
}

profileRouter.post(
    "/ProfileService/GetSemLinkStatus",
    jsonMiddleware(),
    (req, res) => {
        res.json({
            IsConfirmed: true,
            LinkedEmail: "mail@example.com",
            IOIAccountId: nilUuid,
            IOIAccountBaseUrl: "https://account.ioi.dk",
        })
    },
)

export { profileRouter }
