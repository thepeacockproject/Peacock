/*
 *     The Peacock Project - a HITMAN server replacement.
 *     Copyright (C) 2021-2024 The Peacock Project Team
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

import { NextFunction, Request, Response, Router } from "express"
import { getConfig } from "./configSwizzleManager"
import { readdir, readFile } from "fs/promises"
import {
    ChallengeProgressionData,
    GameVersion,
    HitsCategoryCategory,
    OfficialSublocation,
    ProgressionData,
    UserProfile,
} from "./types/types"
import { join } from "path"
import {
    getRemoteService,
    getSublocations,
    isSniperLocation,
    levelForXp,
    uuidRegex,
    versions,
} from "./utils"
import { getUserData, loadUserData, writeUserData } from "./databaseHandler"
import { controller } from "./controller"
import { log, LogLevel } from "./loggingInterop"
import { OfficialServerAuth, userAuths } from "./officialServerAuth"
import { AxiosError } from "axios"
import { SNIPER_UNLOCK_TO_LOCATION } from "./menuData"

type OfficialProfileResponse = UserProfile & {
    Extensions: {
        progression: {
            Unlockables: {
                [unlockableId: string]: ProgressionData
            }
        }
    }
}

type SubPackageData = {
    [id: string]: ProgressionData
}

const webFeaturesRouter = Router()

if (PEACOCK_DEV) {
    webFeaturesRouter.use((_req, res, next) => {
        res.set("Access-Control-Allow-Origin", "*")
        res.set(
            "Access-Control-Allow-Methods",
            "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
        )
        res.set("Access-Control-Allow-Headers", "content-type")
        next()
    })
}

type CommonRequest<ExtraQuery = Record<never, never>> = Request<
    unknown,
    unknown,
    unknown,
    {
        user: string
        gv: Exclude<GameVersion, "scpc">
    } & ExtraQuery
>

function commonValidationMiddleware(
    req: CommonRequest,
    res: Response,
    next: NextFunction,
): void {
    if (!req.query.gv || !versions.includes(req.query.gv ?? null)) {
        res.json({
            success: false,
            error: "invalid game version",
        })
        return
    }

    if (!req.query.user || !uuidRegex.test(req.query.user)) {
        res.json({
            success: false,
            error: "The request must contain the uuid of a user.",
        })
        return
    }

    next()
}

function formErrorMessage(res: Response, message: string): void {
    res.json({
        success: false,
        error: message,
    })
}

webFeaturesRouter.get("/codenames", (_, res) => {
    res.json(getConfig("EscalationCodenames", false))
})

webFeaturesRouter.get("/local-users", async (req: CommonRequest, res) => {
    // Validate that gv is h1, h2, or h3
    function validateGv(gv: unknown): gv is "h1" | "h2" | "h3" {
        return versions.includes(gv as Exclude<GameVersion, "scpc">)
    }

    if (!validateGv(req.query.gv)) {
        res.json([])
        return
    }

    let dir

    if (req.query.gv === "h3") {
        dir = join("userdata", "users")
    } else {
        dir = join("userdata", req.query.gv, "users")
    }

    const files: string[] = (await readdir(dir)).filter(
        (name) => name !== "lop.json",
    )

    /**
     * Sync this type with `webui/src/utils`!
     */
    type BasicUser = Readonly<{
        id: string
        name: string
        platform: string
        lastOfficialSync: string | null
    }>

    const result: BasicUser[] = []

    for (const file of files) {
        if (file === "lop.json") continue

        const read = JSON.parse(
            (await readFile(join(dir, file))).toString(),
        ) as UserProfile

        result.push({
            id: read.Id,
            name: read.Gamertag,
            platform: read.EpicId ? "Epic" : "Steam",
            lastOfficialSync:
                read.Extensions.LastOfficialSync?.toString() || null,
        })
    }

    res.json(result)
})

webFeaturesRouter.get(
    "/modify",
    commonValidationMiddleware,
    async (req: CommonRequest<{ level: string; id: string }>, res) => {
        if (!req.query.level) {
            formErrorMessage(
                res,
                "The request must contain the level to set the escalation to.",
            )
            return
        }

        if (
            isNaN(parseInt(req.query.level)) ||
            parseInt(req.query.level) <= 0
        ) {
            formErrorMessage(res, "The level must be a positive integer.")
            return
        }

        if (!req.query.id || !uuidRegex.test(req.query.id)) {
            formErrorMessage(
                res,
                "The request must contain the uuid of an escalation.",
            )
            return
        }

        try {
            await loadUserData(req.query.user, req.query.gv)
        } catch (e) {
            formErrorMessage(res, "Failed to load user data.")
            return
        }

        const mapping = controller.escalationMappings.get(req.query.id)

        if (!mapping) {
            formErrorMessage(res, "Unknown escalation.")
            return
        }

        if (Object.keys(mapping).length < parseInt(req.query.level, 10)) {
            formErrorMessage(
                res,
                "Cannot exceed the maximum level for this escalation!",
            )
            return
        }

        log(
            LogLevel.INFO,
            `Setting the level of escalation ${req.query.id} to ${req.query.level}`,
        )
        const read = getUserData(req.query.user, req.query.gv)

        read.Extensions.PeacockEscalations[req.query.id] = parseInt(
            req.query.level,
        )

        if (
            read.Extensions.PeacockCompletedEscalations.includes(req.query.id)
        ) {
            read.Extensions.PeacockCompletedEscalations =
                read.Extensions.PeacockCompletedEscalations.filter(
                    (val) => val !== req.query.id,
                )
        }

        writeUserData(req.query.user, req.query.gv)

        res.json({ success: true })
    },
)

webFeaturesRouter.get(
    "/user-progress",
    commonValidationMiddleware,
    async (req: CommonRequest, res) => {
        try {
            await loadUserData(req.query.user, req.query.gv)
        } catch (e) {
            formErrorMessage(res, "Failed to load user data.")
            return
        }

        const d = getUserData(req.query.user, req.query.gv)

        res.json(d.Extensions.PeacockEscalations)
    },
)

type EscalationData = {
    PeacockEscalations: {
        [escalationId: string]: number
    }
    PeacockCompletedEscalations: string[]
}

type OfficialHitsCategory = {
    data: HitsCategoryCategory
}

async function getHitsCategory(
    auth: OfficialServerAuth,
    remoteService: string,
    category: string,
    page: number,
): Promise<[results: EscalationData, hasMore: boolean]> {
    const data: EscalationData = {
        PeacockEscalations: {},
        PeacockCompletedEscalations: [],
    }

    const hits = await auth._useService<OfficialHitsCategory>(
        `https://${remoteService}.hitman.io/profiles/page/HitsCategory?page=${page}&type=${category}&mode=dataonly`,
        true,
    )

    for (const hit of hits.data.data.Data.Hits) {
        data.PeacockEscalations[hit.Id] =
            hit.UserCentricContract.Data.EscalationCompletedLevels! + 1

        if (hit.UserCentricContract.Data.EscalationCompleted)
            data.PeacockCompletedEscalations.push(hit.Id)
    }

    return [data, hits.data.data.Data.HasMore]
}

async function getAllHitsCategory(
    auth: OfficialServerAuth,
    remoteService: string,
    category: string,
): Promise<EscalationData> {
    const data: EscalationData = {
        PeacockEscalations: {},
        PeacockCompletedEscalations: [],
    }

    let page = 0
    let hasMore = true

    while (hasMore) {
        const [results, more] = await getHitsCategory(
            auth,
            remoteService,
            category,
            page,
        )

        data.PeacockEscalations = {
            ...data.PeacockEscalations,
            ...results.PeacockEscalations,
        }

        data.PeacockCompletedEscalations = [
            ...data.PeacockCompletedEscalations,
            ...results.PeacockCompletedEscalations,
        ]

        page++
        hasMore = more
    }

    return data
}

webFeaturesRouter.post(
    "/sync-progress",
    commonValidationMiddleware,
    async (req: CommonRequest, res) => {
        const remoteService = getRemoteService(req.query.gv)
        const auth = userAuths.get(req.query.user)

        if (!auth) {
            formErrorMessage(
                res,
                "Failed to get official authentication data. Please connect to Peacock first.",
            )
            return
        }

        const userdata = getUserData(req.query.user, req.query.gv)

        try {
            // Challenge Progression
            log(LogLevel.DEBUG, "Getting challenge progression...")

            const challengeProgression = await auth._useService<
                ChallengeProgressionData[]
            >(
                `https://${remoteService}.hitman.io/authentication/api/userchannel/ChallengesService/GetProgression`,
                false,
                {
                    profileid: req.query.user,
                    challengeids: controller.challengeService.getChallengeIds(
                        req.query.gv,
                    ),
                },
            )

            userdata.Extensions.ChallengeProgression = Object.fromEntries(
                challengeProgression.data.map((data) => {
                    return [
                        data.ChallengeId,
                        {
                            Ticked: data.Completed,
                            Completed: data.Completed,
                            CurrentState:
                                (data.State["CurrentState"] as string) ??
                                "Start",
                            State: data.State,
                        },
                    ]
                }),
            )

            // Profile Progression
            log(LogLevel.DEBUG, "Getting profile progression...")

            const exts = await auth._useService<OfficialProfileResponse>(
                `https://${remoteService}.hitman.io/authentication/api/userchannel/ProfileService/GetProfile`,
                false,
                {
                    id: req.query.user,
                    extensions: [
                        "achievements",
                        "friends",
                        "gameclient",
                        "gamepersistentdata",
                        "opportunityprogression",
                        "progression",
                        "defaultloadout",
                    ],
                },
            )

            if (req.query.gv !== "h1") {
                log(LogLevel.DEBUG, "Processing PlayerProfileXP...")

                const sublocations = exts.data.Extensions.progression
                    .PlayerProfileXP
                    .Sublocations as unknown as OfficialSublocation[]

                userdata.Extensions.progression.PlayerProfileXP = {
                    ...userdata.Extensions.progression.PlayerProfileXP,
                    Total: exts.data.Extensions.progression.PlayerProfileXP
                        .Total,
                    ProfileLevel: levelForXp(
                        exts.data.Extensions.progression.PlayerProfileXP.Total,
                    ),
                    Sublocations: Object.fromEntries(
                        sublocations.map((value) => [
                            value.Location,
                            {
                                Xp: value.Xp,
                                ActionXp: value.ActionXp,
                            },
                        ]),
                    ),
                }

                log(LogLevel.DEBUG, "Processing opportunity progression...")

                userdata.Extensions.opportunityprogression = Object.fromEntries(
                    Object.keys(
                        exts.data.Extensions.opportunityprogression || {},
                    ).map((value) => [value, true]),
                )

                if (exts.data.Extensions.progression.Unlockables) {
                    log(LogLevel.DEBUG, "Processing unlockables...")

                    for (const [unlockId, data] of Object.entries(
                        exts.data.Extensions.progression.Unlockables,
                    )) {
                        const unlockableId = unlockId.toUpperCase()

                        if (!(unlockableId in SNIPER_UNLOCK_TO_LOCATION))
                            continue
                        ;(
                            userdata.Extensions.progression.Locations[
                                SNIPER_UNLOCK_TO_LOCATION[unlockableId]
                            ] as SubPackageData
                        )[unlockableId] = {
                            Xp: data.Xp,
                            Level: data.Level,
                            PreviouslySeenXp: data.PreviouslySeenXp,
                        }
                    }
                }
            }

            userdata.Extensions.gamepersistentdata =
                exts.data.Extensions.gamepersistentdata || {}

            const sublocations = getSublocations(req.query.gv)
            userdata.Extensions.defaultloadout ??= {}

            if (exts.data.Extensions.defaultloadout) {
                for (const [parent, loadout] of Object.entries(
                    exts.data.Extensions.defaultloadout,
                )) {
                    for (const child of sublocations[parent]) {
                        userdata.Extensions.defaultloadout[child] = loadout
                    }
                }
            }

            userdata.Extensions.achievements =
                exts.data.Extensions.achievements || []

            for (const [locId, data] of Object.entries(
                exts.data.Extensions.progression.Locations,
            )) {
                const location = (
                    locId.startsWith("location_parent")
                        ? locId
                        : locId.replace("location_", "location_parent_")
                ).toUpperCase()

                if (isSniperLocation(location)) continue

                if (req.query.gv === "h1") {
                    const parent = location.endsWith("PRO1")
                        ? location.substring(0, location.length - 5)
                        : location

                    const packageId: string = location.endsWith("PRO1")
                        ? "pro1"
                        : "normal"

                    ;(
                        userdata.Extensions.progression.Locations[
                            parent
                        ] as SubPackageData
                    )[packageId] = {
                        Xp: data.Xp as number,
                        Level: data.Level as number,
                        PreviouslySeenXp: data.Xp as number,
                    }
                } else {
                    userdata.Extensions.progression.Locations[location] = {
                        Xp: data.Xp as number,
                        Level: data.Level as number,
                        PreviouslySeenXp: data.PreviouslySeenXp as number,
                    }
                }
            }

            // Escalation & Arcade Progression
            log(
                LogLevel.DEBUG,
                `Getting escalation${req.query.gv === "h3" ? " & arcade" : ""} progression...`,
            )

            const escalations = await getAllHitsCategory(
                auth,
                remoteService!,
                "ContractAttack",
            )

            const arcade =
                req.query.gv === "h3"
                    ? await getAllHitsCategory(auth, remoteService!, "Arcade")
                    : {
                          PeacockEscalations: {},
                          PeacockCompletedEscalations: [],
                      }

            userdata.Extensions.PeacockEscalations = {
                ...userdata.Extensions.PeacockEscalations,
                ...escalations.PeacockEscalations,
                ...arcade.PeacockEscalations,
            }

            userdata.Extensions.PeacockCompletedEscalations = [
                ...userdata.Extensions.PeacockCompletedEscalations,
                ...escalations.PeacockCompletedEscalations,
                ...arcade.PeacockCompletedEscalations,
            ]

            for (const id of userdata.Extensions.PeacockCompletedEscalations) {
                userdata.Extensions.PeacockPlayedContracts[id] = {
                    LastPlayedAt: new Date().getTime(),
                    Completed: true,
                    IsEscalation: true,
                }
            }

            // Freelancer Progression
            // TODO: Try and see if there is a less intensive way to do this
            // GetForPlay2 is quite intensive on IOI's side as it starts a session
            if (req.query.gv === "h3") {
                log(LogLevel.DEBUG, "Getting freelancer progression...")

                await auth._useService(
                    `https://${remoteService}.hitman.io/authentication/api/configuration/Init?configName=pc-prod&lockedContentDisabled=false&isFreePrologueUser=false&isIntroPackUser=false&isFullExperienceUser=true`,
                    true,
                )

                const freelancerSession = await auth._useService<{
                    ContractProgressionData: Record<
                        string,
                        string | number | boolean
                    >
                }>(
                    `https://${remoteService}.hitman.io/authentication/api/userchannel/ContractsService/GetForPlay2`,
                    false,
                    {
                        id: "f8ec92c2-4fa2-471e-ae08-545480c746ee",
                        locationId: "",
                        extraGameChangerIds: [],
                        difficultyLevel: 0,
                    },
                )

                userdata.Extensions.CPD[
                    "f8ec92c2-4fa2-471e-ae08-545480c746ee"
                ] = freelancerSession.data.ContractProgressionData
            }

            userdata.Extensions.LastOfficialSync = new Date().toISOString()

            writeUserData(req.query.user, req.query.gv)
        } catch (error) {
            if (error instanceof AxiosError) {
                formErrorMessage(
                    res,
                    `Failed to sync official data: got ${error.response?.status} ${error.response?.statusText}.`,
                )
                return
            } else {
                formErrorMessage(
                    res,
                    `Failed to sync official data: got ${JSON.stringify(error)}.`,
                )
                return
            }
        }

        res.json({
            success: true,
        })
    },
)

export { webFeaturesRouter }
