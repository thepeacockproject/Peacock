/*
 *     The Peacock Project - a HITMAN server replacement.
 *     Copyright (C) 2021-2022 The Peacock Project Team
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
import { castUserProfile, nilUuid, uuidRegex } from "./utils"
import { json as jsonMiddleware } from "body-parser"
import { getPlatformEntitlements } from "./platformEntitlements"
import {
    getActiveSessionIdForUser,
    loadSession,
    newSession,
    saveSession,
} from "./eventHandler"
import type {
    CompiledChallengeRuntimeData,
    GameVersion,
    RequestWithJwt,
    SaveFile,
    UserProfile,
} from "./types/types"
import { log, LogLevel } from "./loggingInterop"
import { getUserData, writeUserData } from "./databaseHandler"
import { randomUUID } from "crypto"
import { getVersionedConfig } from "./configSwizzleManager"
import { createInventory } from "./inventory"
import { controller } from "./controller"
import { loadouts } from "./loadouts"
import { getFlag } from "./flags"
import { menuSystemDatabase } from "./menus/menuSystem"
import { compileRuntimeChallenge } from "./candle/challengeHelpers"
import { LoadSaveBody } from "./types/gameSchemas"

const profileRouter = Router()

// /authentication/api/userchannel/

interface FakePlayer {
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
                Object.prototype.hasOwnProperty.call(
                    userdata.Extensions,
                    extension,
                ) &&
                !Object.prototype.hasOwnProperty.call(
                    req.body.extensions,
                    extension,
                )
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
        const exts = getUserData(
            req.jwt.unique_name,
            req.gameVersion,
        ).Extensions

        res.json(
            createInventory(req.jwt.unique_name, req.gameVersion, exts.entP),
        )
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
            Inventory: createInventory(
                req.jwt.unique_name,
                req.gameVersion,
                userdata.Extensions.entP,
            ),
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
                userdata = castUserProfile(outcome.value)
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
        req: RequestWithJwt<Record<string, never>, { contractId: string }>,
        res,
    ) => {
        if (!uuidRegex.test(req.body.contractId)) {
            return res.status(404).send("invalid contract")
        }

        const json = controller.resolveContract(req.body.contractId)

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

        let challenges: CompiledChallengeRuntimeData[] = getVersionedConfig(
            "GlobalChallenges",
            req.gameVersion,
            true,
        )

        challenges.push(
            ...Object.values(
                controller.challengeService.getChallengesForContract(
                    json.Metadata.Id,
                    req.gameVersion,
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

        for (const challenge of challenges) {
            if (challenge.Challenge.Tags?.includes("shortcut")) {
                challenge.Progression = {
                    ChallengeId: challenge.Challenge.Id,
                    ProfileId: req.jwt.unique_name,
                    Completed: true,
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
                    ),
            },
            LevelsDefinition: {
                Location: [0],
                PlayerProfile: {
                    Version: 1,
                    XpPerLevel: 6000,
                    MaxLevel: 5000,
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
            //#region Save with loadout profiles
            let loadout = loadouts.getLoadoutFor(req.gameVersion)

            if (!loadout) {
                loadout = loadouts.createDefault(req.gameVersion)
            }

            loadout.data[req.body.location] = req.body.loadout

            await loadouts.save()
            //#endregion
        } else {
            //#region Save with legacy (per-user) system
            const userdata = getUserData(req.jwt.unique_name, req.gameVersion)

            if (userdata.Extensions.defaultloadout === undefined) {
                userdata.Extensions.defaultloadout = {}
            }

            userdata.Extensions.defaultloadout[req.body.location] =
                req.body.loadout

            writeUserData(req.jwt.unique_name, req.gameVersion)
            //#endregion
        }

        res.status(204).end()
    },
)

profileRouter.post(
    "/ProfileService/UpdateUserSaveFileTable",
    jsonMiddleware(),
    async (req, res) => {
        if (req.body.clientSaveFileList.length > 0) {
            log(LogLevel.DEBUG, JSON.stringify(req.body.clientSaveFileList))
            const save: SaveFile = req.body.clientSaveFileList.reduce(
                (prev: SaveFile, current: SaveFile) =>
                    prev.TimeStamp > current.TimeStamp ? prev : current,
            )
            log(
                LogLevel.DEBUG,
                `Saving to slot ${save.Value.Name} which was saved at ${save.TimeStamp}`,
            )
            // const save =
            //     req.body.clientSaveFileList[
            //         req.body.clientSaveFileList.length - 1
            //     ]

            try {
                await saveSession(
                    save.ContractSessionId,
                    save.Value.LastEventToken,
                )
            } catch (e) {
                log(
                    LogLevel.WARN,
                    `Unable to save session ${save?.ContractSessionId}`,
                )

                if (PEACOCK_DEV) {
                    log(LogLevel.DEBUG, e.name)
                }
            }
        }

        res.status(204).end()
    },
)

profileRouter.post(
    "/ContractSessionsService/Load",
    jsonMiddleware(),
    async (req: RequestWithJwt<never, LoadSaveBody>, res) => {
        if (
            !req.body.contractSessionId ||
            !req.body.saveToken ||
            !req.body.contractId
        ) {
            res.status(400).send("bad body")
            return
        }

        try {
            await loadSession(req.body.contractSessionId, req.body.saveToken)
        } catch (e) {
            log(
                LogLevel.DEBUG,
                `Failed to load contract with token = ${req.body.saveToken}, session id = ${req.body.contractSessionId}.`,
            )
            log(LogLevel.DEBUG, JSON.stringify(e))
            if (
                getActiveSessionIdForUser(req.jwt.unique_name) ===
                req.body.contractSessionId
            ) {
                log(
                    LogLevel.INFO,
                    "Tried to load the active session, prevented to avoid crash.",
                )
            } else {
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
        }

        res.send(`"${req.body.contractSessionId}"`)
    },
)

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
