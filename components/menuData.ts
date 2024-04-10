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

import { getMissionEndData, MissionEndError } from "./scoreHandler"
import { Response, Router } from "express"
import {
    contractCreationTutorialId,
    getMaxProfileLevel,
    isSuit,
    unlockOrderComparer,
    uuidRegex,
} from "./utils"
import { contractSessions, getSession } from "./eventHandler"
import { getConfig, getVersionedConfig } from "./configSwizzleManager"
import { controller } from "./controller"
import { createLocationsData, getDestination } from "./menus/destinations"
import type {
    ContractSearchResult,
    GameVersion,
    HitsCategoryCategory,
    PeacockLocationsData,
    RequestWithJwt,
    SceneConfig,
    SelectEntranceOrPickupData,
    UserCentricContract,
} from "./types/types"
import {
    complications,
    generateCompletionData,
    generateUserCentric,
} from "./contracts/dataGen"
import { log, LogLevel } from "./loggingInterop"
import {
    contractsModeHome,
    officialSearchContract,
} from "./contracts/contractsModeRouting"
import random from "random"
import { getUserData } from "./databaseHandler"
import { getGamePlayNextData } from "./menus/playnext"
import { randomUUID } from "crypto"
import {
    GamePlanningData,
    getPlanningData,
    PlanningError,
} from "./menus/planning"
import {
    deleteMultiple,
    directRoute,
    withLookupDialog,
} from "./menus/favoriteContracts"
import { createInventory, getUnlockableById } from "./inventory"
import { json as jsonMiddleware } from "body-parser"
import { hitsCategoryService } from "./contracts/hitsCategoryService"
import {
    ChallengeLocationQuery,
    DebriefingLeaderboardsQuery,
    GetCompletionDataForLocationQuery,
    GetDestinationQuery,
    GetMasteryCompletionDataForUnlockableQuery,
    LeaderboardEntriesCommonQuery,
    LookupContractPublicIdQuery,
    MasteryUnlockableQuery,
    MissionEndRequestQuery,
    PlanningQuery,
    SafehouseCategoryQuery,
    SafehouseQuery,
    StashpointQuery,
    StashpointQueryH2016,
} from "./types/gameSchemas"
import assert from "assert"
import { MissionEndResult } from "./types/score"
import { getLeaderboardEntries } from "./contracts/leaderboards"
import {
    getLegacyStashData,
    getModernStashData,
    getSafehouseCategory,
} from "./menus/stashpoints"
import { getHubData } from "./menus/hub"
import { getPlayerProfileData } from "./menus/playerProfile"

const menuDataRouter = Router()

// We make this lookup table to quickly get it, there's no other quick way for it.
export const SNIPER_UNLOCK_TO_LOCATION: Record<string, string> = {
    FIREARMS_SC_HERO_SNIPER_HM: "LOCATION_PARENT_AUSTRIA",
    FIREARMS_SC_HERO_SNIPER_KNIGHT: "LOCATION_PARENT_AUSTRIA",
    FIREARMS_SC_HERO_SNIPER_STONE: "LOCATION_PARENT_AUSTRIA",
    FIREARMS_SC_SEAGULL_HM: "LOCATION_PARENT_SALTY",
    FIREARMS_SC_SEAGULL_KNIGHT: "LOCATION_PARENT_SALTY",
    FIREARMS_SC_SEAGULL_STONE: "LOCATION_PARENT_SALTY",
    FIREARMS_SC_FALCON_HM: "LOCATION_PARENT_CAGED",
    FIREARMS_SC_FALCON_KNIGHT: "LOCATION_PARENT_CAGED",
    FIREARMS_SC_FALCON_STONE: "LOCATION_PARENT_CAGED",
}

// /profiles/page/

menuDataRouter.get(
    "/ChallengeLocation",
    // @ts-expect-error Jwt props.
    (req: RequestWithJwt<ChallengeLocationQuery>, res) => {
        const pack = controller.challengeService.challengePacks.get(
            req.query.locationId,
        )

        const location = getVersionedConfig<PeacockLocationsData>(
            "LocationsData",
            req.gameVersion,
            true,
        ).children[req.query.locationId]

        if (!pack && !location) {
            res.status(400).send("Invalid locationId")
            return
        }

        const data = {
            Name: pack ? pack.Name : location.DisplayNameLocKey,
            Location: location,
            Children: controller.challengeService.getChallengeDataForCategory(
                pack ? req.query.locationId : null,
                pack ? undefined : location,
                req.gameVersion,
                req.jwt.unique_name,
            ),
        }

        res.json({
            template: getVersionedConfig(
                "ChallengeLocationTemplate",
                req.gameVersion,
                false,
            ),
            data,
        })
    },
)

// @ts-expect-error Jwt props.
menuDataRouter.get("/Hub", (req: RequestWithJwt, res) => {
    const hubInfo = getHubData(req.gameVersion, req.jwt.unique_name)

    let template: unknown

    if (req.gameVersion === "h3" || req.gameVersion === "h2") {
        template = null
    } else {
        template =
            req.gameVersion === "scpc"
                ? getConfig("FrankensteinHubTemplate", false)
                : getConfig("LegacyHubTemplate", false)
    }

    res.json({
        template,
        data: hubInfo,
    })
})

// @ts-expect-error Jwt props.
menuDataRouter.get("/SafehouseCategory", (req: RequestWithJwt, res) => {
    res.json({
        template:
            req.gameVersion === "h1"
                ? getConfig("LegacySafehouseTemplate", false)
                : null,
        data: getSafehouseCategory(req.query, req.gameVersion, req.jwt),
    })
})

// @ts-expect-error Jwt props.
menuDataRouter.get("/Safehouse", (req: RequestWithJwt<SafehouseQuery>, res) => {
    const template = getConfig("LegacySafehouseTemplate", false)

    const newQuery: SafehouseCategoryQuery = {
        type: req.query.type,
    }

    res.json({
        template,
        data: {
            SafehouseData: getSafehouseCategory(
                newQuery,
                req.gameVersion,
                req.jwt,
            ),
        },
    })
})

// @ts-expect-error Jwt props.
menuDataRouter.get("/report", (req: RequestWithJwt, res) => {
    res.json({
        template: getVersionedConfig("ReportTemplate", req.gameVersion, false),
        data: {
            Reasons: [
                { Id: 0, Title: "UI_MENU_REPORT_REASON_OFFENSIVE" },
                { Id: 1, Title: "UI_MENU_REPORT_REASON_BUGGY" },
            ],
        },
    })
})

// /stashpoint?contractid=e5b6ccf4-1f29-4ec6-bfb8-2e9b78882c85&slotid=4&slotname=gear4&stashpoint=&allowlargeitems=true&allowcontainers=true
// /stashpoint?contractid=c1d015b4-be08-4e44-808e-ada0f387656f&slotid=3&slotname=disguise3&stashpoint=&allowlargeitems=true&allowcontainers=true
// /stashpoint?contractid=&slotid=3&slotname=disguise&stashpoint=&allowlargeitems=true&allowcontainers=false
// /stashpoint?contractid=5b5f8aa4-ecb4-4a0a-9aff-98aa1de43dcc&slotid=6&slotname=stashpoint6&stashpoint=28b03709-d1f0-4388-b207-f03611eafb64&allowlargeitems=true&allowcontainers=false
menuDataRouter.get(
    "/stashpoint",
    // @ts-expect-error Jwt props.
    (req: RequestWithJwt<StashpointQuery | StashpointQueryH2016>, res) => {
        function isValidModernQuery(
            query: StashpointQuery | StashpointQueryH2016,
        ): query is StashpointQuery {
            return (
                query?.slotname !== undefined &&
                (query as StashpointQuery)?.slotid !== undefined
            )
        }

        if (["h1", "scpc"].includes(req.gameVersion)) {
            // H1 or SCPC
            if (!uuidRegex.test(req.query.contractid!)) {
                res.status(400).send("contract id was not a uuid")
                return
            }

            if (typeof req.query.slotname !== "string") {
                res.status(400).send("invalid slot data")
                return
            }

            const data = getLegacyStashData(
                req.query,
                req.jwt.unique_name,
                req.gameVersion,
            )

            if (!data) {
                res.status(400).send("impossible to fulfill")
                return
            }

            res.json({
                template: getConfig("LegacyStashpointTemplate", false),
                data,
            })
        } else {
            // H2 or H3
            if (!isValidModernQuery(req.query)) {
                res.status(400).send("invalid query")
                return
            }

            res.json({
                template: getVersionedConfig(
                    "StashpointTemplate",
                    req.gameVersion === "h1" ? "h1" : "h3",
                    false,
                ),
                data: getModernStashData(
                    req.query,
                    req.jwt.unique_name,
                    req.gameVersion,
                ),
            })
        }
    },
)

menuDataRouter.get(
    "/missionrewards",
    // @ts-expect-error Jwt props.
    (
        req: RequestWithJwt<{
            contractSessionId: string
        }>,
        res,
    ) => {
        const s = getSession(req.jwt.unique_name)

        if (!s) {
            res.status(400).send("no session")
            return
        }

        const { contractId } = s
        const contractData = controller.resolveContract(contractId, true)
        const userData = getUserData(req.jwt.unique_name, req.gameVersion)

        res.json({
            template: getConfig("MissionRewardsTemplate", false),
            data: {
                LevelInfo: [
                    0, 6000, 12000, 18000, 24000, 30000, 36000, 42000, 48000,
                    54000, 60000, 66000, 72000, 78000, 84000, 90000, 96000,
                    102000, 108000, 114000,
                ],
                XP: 0,
                Level: 1,
                Completion: 0,
                XPGain: 0,
                Challenges: Object.values(
                    controller.challengeService.getChallengesForContract(
                        contractId,
                        req.gameVersion,
                        req.jwt.unique_name,
                        // TODO: Should a difficulty be passed here?
                    ),
                )
                    .flat()
                    // FIXME: This behaviour may not be accurate to original server
                    .filter((challengeData) =>
                        controller.challengeService.fastGetIsCompleted(
                            userData,
                            challengeData.Id,
                        ),
                    )
                    .map((challengeData) =>
                        controller.challengeService.compileRegistryChallengeTreeData(
                            challengeData,
                            controller.challengeService.getPersistentChallengeProgression(
                                req.jwt.unique_name,
                                challengeData.Id,
                                req.gameVersion,
                            ),
                            req.gameVersion,
                            req.jwt.unique_name,
                        ),
                    ),
                Drops: [],
                ContractCompletionBonus: 0,
                GroupCompletionBonus: 0,
                LocationHideProgression: true,
                Difficulty: "normal", // FIXME: is this right?
                CompletionData: generateCompletionData(
                    contractData?.Metadata.Location || "",
                    req.jwt.unique_name,
                    req.gameVersion,
                ),
            },
        })
    },
)

menuDataRouter.get(
    "/Planning",
    // @ts-expect-error Jwt props.
    async (req: RequestWithJwt<PlanningQuery>, res) => {
        if (!req.query.contractid || !req.query.resetescalation) {
            res.status(400).send("invalid query")
            return
        }

        const planningData = await getPlanningData(
            req.query.contractid,
            req.query.resetescalation === "true",
            req.jwt.unique_name,
            req.gameVersion,
        )

        if ((planningData as PlanningError).error) {
            res.status(400).send("check console")
            return
        }

        let template: unknown | null = null

        if (req.gameVersion === "h1") {
            template = getConfig("LegacyPlanningTemplate", false)
        } else if (req.gameVersion === "scpc") {
            template = getConfig("FrankensteinPlanningTemplate", false)
        }

        res.json({
            template,
            data: planningData,
        })
    },
)

menuDataRouter.get(
    "/selectagencypickup",
    // @ts-expect-error Jwt props.
    (
        req: RequestWithJwt<{
            contractId: string
        }>,
        res,
    ) => {
        const pickupData = getConfig<SceneConfig>("AgencyPickups", false)

        const inventory = createInventory(req.jwt.unique_name, req.gameVersion)

        const contractData = controller.resolveContract(req.query.contractId)

        if (!contractData) {
            log(
                LogLevel.WARN,
                `Unknown contract on SAP: ${req.query.contractId}`,
            )
            return res.status(404).end()
        }

        const scenePath = contractData.Metadata.ScenePath.toLowerCase()

        log(
            LogLevel.DEBUG,
            `Looking up details for contract - Id:${req.query.contractId} (${scenePath})`,
        )

        if (!pickupData[scenePath]) {
            log(
                LogLevel.ERROR,
                `Could not find AgencyPickup data for ${scenePath}! This may cause an unhandled promise rejection.`,
            )
        }

        if (contractData.Peacock?.noAgencyPickupsActive === true) {
            const data: SelectEntranceOrPickupData = {
                Unlocked: [],
                Contract: contractData,
                OrderedUnlocks: [],
                UserCentric: generateUserCentric(
                    contractData,
                    req.jwt.unique_name,
                    req.gameVersion,
                )!,
            }

            res.json({
                template: getVersionedConfig(
                    "SelectAgencyPickupTemplate",
                    req.gameVersion,
                    false,
                ),
                data,
            })
            return
        }

        const pickupsInScene = pickupData[scenePath]

        const unlockedAgencyPickups = inventory
            .filter(
                (item) =>
                    item.Unlockable.Type === "agencypickup" &&
                    item.Unlockable.Properties.Difficulty ===
                        contractData.Metadata.Difficulty &&
                    item.Unlockable.Properties.RepositoryId,
            )
            .map((i) => i.Unlockable)

        const data: SelectEntranceOrPickupData = {
            Unlocked: unlockedAgencyPickups.map(
                (unlockable) => unlockable.Properties.RepositoryId!,
            ),
            Contract: contractData,
            OrderedUnlocks: unlockedAgencyPickups
                .filter((unlockable) =>
                    pickupsInScene.includes(
                        unlockable.Properties.RepositoryId || "",
                    ),
                )
                .sort(unlockOrderComparer),
            UserCentric: generateUserCentric(
                contractData,
                req.jwt.unique_name,
                req.gameVersion,
            )!,
        }

        res.json({
            template: getVersionedConfig(
                "SelectAgencyPickupTemplate",
                req.gameVersion,
                false,
            ),
            data,
        })
    },
)

menuDataRouter.get(
    "/selectentrance",
    // @ts-expect-error Jwt props.
    (
        req: RequestWithJwt<{
            contractId: string
        }>,
        res,
    ) => {
        const entranceData = getConfig<SceneConfig>("Entrances", false)

        const inventory = createInventory(req.jwt.unique_name, req.gameVersion)

        const contractData = controller.resolveContract(req.query.contractId)

        if (!contractData) {
            log(LogLevel.WARN, `Unknown contract: ${req.query.contractId}`)
            return res.status(404).end()
        }

        const scenePath = contractData.Metadata.ScenePath.toLowerCase()

        log(
            LogLevel.DEBUG,
            `Looking up details for contract - Id:${req.query.contractId} (${scenePath})`,
        )

        if (!entranceData[scenePath]) {
            log(
                LogLevel.ERROR,
                `Could not find Entrance data for ${scenePath}! This may cause an unhandled promise rejection.`,
            )
        }

        const entrancesInScene = entranceData[scenePath]

        const unlockedEntrances = inventory
            .filter(
                (item) =>
                    item.Unlockable.Subtype === "startinglocation" &&
                    item.Unlockable.Properties.Difficulty ===
                        contractData.Metadata.Difficulty &&
                    item.Unlockable.Properties.RepositoryId,
            )
            .map((i) => i.Unlockable)

        const data: SelectEntranceOrPickupData = {
            Unlocked: unlockedEntrances.map(
                (unlockable) => unlockable.Properties.RepositoryId!,
            ),
            Contract: contractData,
            OrderedUnlocks: unlockedEntrances
                .filter((unlockable) =>
                    entrancesInScene.includes(
                        unlockable.Properties.RepositoryId!,
                    ),
                )
                .sort(unlockOrderComparer),
            UserCentric: generateUserCentric(
                contractData,
                req.jwt.unique_name,
                req.gameVersion,
            )!,
        }

        res.json({
            template: getVersionedConfig(
                "SelectEntranceTemplate",
                req.gameVersion,
                true,
            ),
            data,
        })
    },
)

menuDataRouter.get("/missionendready", async (req, res) => {
    const sessionDetails = contractSessions.get(
        req.query.contractSessionId as string,
    )

    const retryCount = 1 + Number(req.query.retryCount) || 0

    if (!sessionDetails?.timerEnd) {
        // not ready
        // wait some time proportional to the amount of retries
        await new Promise<void>((resolve) =>
            setTimeout(() => resolve(undefined), retryCount * 100),
        )

        res.json({
            template: getConfig("MissionEndNotReadyTemplate", false),
            data: {
                contractSessionId: req.query.contractSessionId,
                missionEndReady: false,
                retryCount: retryCount,
            },
        })
    } else {
        // ready
        res.json({
            template: getConfig("MissionEndReadyTemplate", false),
            data: {
                contractSessionId: req.query.contractSessionId,
                missionEndReady: true,
                retryCount: retryCount,
            },
        })
    }
})

const missionEndRequest = async (
    req: RequestWithJwt<Partial<MissionEndRequestQuery>>,
    res: Response,
) => {
    if (!req.query.contractSessionId) {
        res.status(400).send("no session id")
        return
    }

    // prototype pollution prevention
    if (/(__proto__|prototype|constructor)/.test(req.query.contractSessionId)) {
        res.status(400).send("invalid session id")
        return
    }

    const missionEndOutput = await getMissionEndData(
        req.query,
        req.jwt,
        req.gameVersion,
    )

    const isErrorPath = (
        output: MissionEndResult | MissionEndError,
    ): output is MissionEndError => {
        return Boolean((output as MissionEndError).errorCode)
    }

    if (isErrorPath(missionEndOutput)) {
        res.status(missionEndOutput.errorCode).send(missionEndOutput.error)
    }

    if (req.path.endsWith("/scoreoverview")) {
        res.json({
            template: getConfig("ScoreOverviewTemplate", false),
            data: (missionEndOutput as MissionEndResult).ScoreOverview,
        })
        return
    }

    res.json({
        template:
            req.gameVersion === "scpc"
                ? getConfig("FrankensteinScoreOverviewTemplate", false)
                : null,
        data: missionEndOutput,
    })
}

// @ts-expect-error Has jwt props.
menuDataRouter.get("/missionend", missionEndRequest)

// @ts-expect-error Has jwt props.
menuDataRouter.get("/scoreoverviewandunlocks", missionEndRequest)

// @ts-expect-error Has jwt props.
menuDataRouter.get("/scoreoverview", missionEndRequest)

menuDataRouter.get(
    "/Destination",
    // @ts-expect-error Jwt props.
    (req: RequestWithJwt<GetDestinationQuery>, res) => {
        if (!req.query.locationId) {
            res.status(400).send("Invalid locationId")
            return
        }

        const destination = getDestination(
            req.query,
            req.gameVersion,
            req.jwt.unique_name,
        )

        res.json({
            template:
                req.gameVersion === "h1"
                    ? getConfig("LegacyDestinationTemplate", false)
                    : null,
            data: destination,
        })
    },
)

async function lookupContractPublicId(
    publicid: string,
    userId: string,
    gameVersion: GameVersion,
) {
    const publicIdRegex = /\d{12}/

    while (publicid.includes("-")) {
        publicid = publicid.replace("-", "")
    }

    if (!publicIdRegex.test(publicid)) {
        return {
            PublicId: publicid,
            ErrorReason: "notfound",
        }
    }

    const contract = await controller.contractByPubId(
        publicid,
        userId,
        gameVersion,
    )

    if (!contract) {
        return {
            PublicId: publicid,
            ErrorReason: "notfound",
        }
    }

    const location = getUnlockableById(contract.Metadata.Location, gameVersion)

    return {
        Contract: contract,
        Location: location,
        UserCentricContract: generateUserCentric(contract, userId, gameVersion),
    }
}

menuDataRouter.get(
    "/LookupContractPublicId",
    // @ts-expect-error Has jwt props.
    async (req: RequestWithJwt<LookupContractPublicIdQuery>, res) => {
        if (typeof req.query.publicid !== "string") {
            return res.status(400).send("no/invalid public id specified!")
        }

        res.json({
            template: getVersionedConfig(
                "LookupContractByIdTemplate",
                req.gameVersion,
                false,
            ),
            data: await lookupContractPublicId(
                req.query.publicid,
                req.jwt.unique_name,
                req.gameVersion,
            ),
        })
    },
)

menuDataRouter.get(
    "/HitsCategory",
    // @ts-expect-error Has jwt props.
    async (
        req: RequestWithJwt<{
            type: string
            page?: number | string
        }>,
        res,
    ) => {
        const category = req.query.type

        const response: {
            template: unknown
            data?: HitsCategoryCategory
        } = {
            template:
                req.gameVersion === "h1"
                    ? getConfig("LegacyHitsCategoryTemplate", false)
                    : null,
            data: undefined,
        }

        let pageNumber = req.query.page || 0

        if (typeof pageNumber === "string") {
            pageNumber = parseInt(pageNumber, 10)
        }

        pageNumber = pageNumber < 0 ? 0 : pageNumber

        response.data = await hitsCategoryService.paginateHitsCategory(
            category,
            pageNumber as number,
            req.gameVersion,
            req.jwt.unique_name,
        )

        res.json(response)
    },
)

menuDataRouter.get(
    "/PlayNext",
    // @ts-expect-error Has jwt props.
    (
        req: RequestWithJwt<{
            contractId: string
        }>,
        res,
    ) => {
        if (!req.query.contractId) {
            res.status(400).send("no contract id!")
            return
        }

        res.json({
            template: getConfig("PlayNextTemplate", false),
            data: getGamePlayNextData(
                req.query.contractId,
                req.jwt.unique_name,
                req.gameVersion,
            ),
        })
    },
)

menuDataRouter.get("/LeaderboardsView", (_, res) => {
    res.json({
        template: getConfig("LeaderboardsViewTemplate", false),
        data: {
            LeaderboardUrl: "leaderboardentries",
            LeaderboardType: "singleplayer",
        },
    })
})

menuDataRouter.get(
    "/LeaderboardEntries",
    // @ts-expect-error Has jwt props.
    async (req: RequestWithJwt<LeaderboardEntriesCommonQuery>, res) => {
        if (!req.query.contractid) {
            res.status(400).send("no contract id!")
            return
        }

        const leaderboardEntriesTemplate = getConfig(
            "LeaderboardEntriesTemplate",
            false,
        )

        const entries = await getLeaderboardEntries(
            req.query.contractid,
            req.jwt.platform,
            req.gameVersion,
            req.query.difficultyLevel,
        )

        res.json({
            template: leaderboardEntriesTemplate,
            data: entries,
        })
    },
)

menuDataRouter.get(
    "/DebriefingLeaderboards",
    // @ts-expect-error Has jwt props.
    async (req: RequestWithJwt<DebriefingLeaderboardsQuery>, res) => {
        if (!req.query.contractid) {
            res.status(400).send("no contract id!")
            return
        }

        const debriefingLeaderboardsTemplate = getConfig(
            "DebriefingLeaderboardsTemplate",
            false,
        )

        const entries = await getLeaderboardEntries(
            req.query.contractid,
            req.jwt.platform,
            req.gameVersion,
            req.query.difficulty,
        )

        res.json({
            template: debriefingLeaderboardsTemplate,
            data: entries,
        })
    },
)

// @ts-expect-error Has jwt props.
menuDataRouter.get("/Contracts", contractsModeHome)

menuDataRouter.get(
    "/contractcreation/planning",
    // @ts-expect-error Has jwt props.
    async (
        req: RequestWithJwt<{
            contractCreationIdOverwrite: string
        }>,
        res,
    ) => {
        const createContractPlanningTemplate = getConfig(
            "CreateContractPlanningTemplate",
            false,
        )

        if (!req.query.contractCreationIdOverwrite) {
            res.status(400).send("invalid query")
            return
        }

        const planningData = await getPlanningData(
            req.query.contractCreationIdOverwrite,
            false,
            req.jwt.unique_name,
            req.gameVersion,
        )

        if ((planningData as PlanningError).error) {
            res.status(400).send("check console")
            return
        }

        const pd: GamePlanningData = planningData as GamePlanningData

        // create contract planning isn't supposed to have the following properties
        delete pd.ElusiveContractState
        delete pd.UserCentric
        delete pd.UserContract
        delete pd.UnlockedEntrances
        delete pd.UnlockedAgencyPickups
        delete pd.Objectives
        delete pd.CharacterLoadoutData
        delete pd.ChallengeData
        delete pd.Currency
        delete pd.PaymentDetails
        delete pd.OpportunityData
        delete pd.PlayerProfileXpData

        res.json({
            template: createContractPlanningTemplate,
            data: pd,
        })
    },
)

// @ts-expect-error Has jwt props.
menuDataRouter.get("/contractsearchpage", (req: RequestWithJwt, res) => {
    const createContractTutorial = controller.resolveContract(
        contractCreationTutorialId,
    )

    res.json({
        template: getVersionedConfig(
            "ContractSearchPageTemplate",
            req.gameVersion,
            false,
        ),
        data: {
            CreateContractTutorial: generateUserCentric(
                createContractTutorial!,
                req.jwt.unique_name,
                req.gameVersion,
            ),
            LocationsData: createLocationsData(req.gameVersion, true),
            FilterData: getVersionedConfig(
                "FilterData",
                req.gameVersion,
                false,
            ),
        },
    })
})

menuDataRouter.post(
    "/ContractSearch",
    jsonMiddleware(),
    // @ts-expect-error Jwt props.
    async (
        req: RequestWithJwt<
            {
                sorting?: unknown
            },
            string[]
        >,
        res,
    ) => {
        const specialContracts: string[] = []

        await controller.hooks.getSearchResults.callAsync(
            req.body,
            specialContracts,
        )

        let searchResult: ContractSearchResult

        if (specialContracts.length > 0) {
            // Handled by a plugin

            const contracts: {
                UserCentricContract: UserCentricContract
            }[] = []

            for (const contract of specialContracts) {
                const userCentric = generateUserCentric(
                    controller.resolveContract(contract),
                    req.jwt.unique_name,
                    req.gameVersion,
                )

                if (!userCentric) {
                    log(
                        LogLevel.ERROR,
                        "UC is null! (contract not registered?)",
                    )
                    continue
                }

                contracts.push({
                    UserCentricContract: userCentric,
                })
            }

            searchResult = {
                Data: {
                    Contracts: contracts,
                    TotalCount: contracts.length,
                    Page: 0,
                    ErrorReason: "",
                    HasPrevious: false,
                    HasMore: false,
                },
            }
        } else {
            // No plugins handle this. Getting search results from official
            searchResult = (await officialSearchContract(
                req.jwt.unique_name,
                req.gameVersion,
                req.body,
                0,
            )) || {
                Data: {
                    Contracts: [],
                    TotalCount: 0,
                    Page: 0,
                    ErrorReason: "",
                    HasPrevious: false,
                    HasMore: false,
                },
            }
        }

        res.json({
            template: getVersionedConfig(
                "ContractSearchResponseTemplate",
                req.gameVersion,
                false,
            ),
            data: searchResult,
        })
    },
)

menuDataRouter.post(
    "/ContractSearchPaginate",
    jsonMiddleware(),
    // @ts-expect-error Has jwt props.
    async (
        req: RequestWithJwt<
            {
                page: number
            },
            string[]
        >,
        res,
    ) => {
        res.json({
            template: getConfig("ContractSearchPaginateTemplate", false),
            data: await officialSearchContract(
                req.jwt.unique_name,
                req.gameVersion,
                req.body,
                req.query.page,
            ),
        })
    },
)

menuDataRouter.get(
    "/DebriefingChallenges",
    // @ts-expect-error Has jwt props.
    (
        req: RequestWithJwt<
            Partial<{
                contractId: string
            }>
        >,
        res,
    ) => {
        if (typeof req.query.contractId !== "string") {
            res.status(400).send("invalid contractId")
            return
        }

        res.json({
            template: getVersionedConfig(
                "DebriefingChallengesTemplate",
                req.gameVersion,
                false,
            ),
            data: {
                ChallengeData: {
                    Children:
                        controller.challengeService.getChallengeTreeForContract(
                            req.query.contractId,
                            req.gameVersion,
                            req.jwt.unique_name,
                        ),
                },
            },
        })
    },
)

// @ts-expect-error Has jwt props.
menuDataRouter.get("/contractcreation/create", (req: RequestWithJwt, res) => {
    let cUuid = randomUUID()
    const createContractReturnTemplate = getConfig(
        "CreateContractReturnTemplate",
        false,
    )

    // if for some reason the id is already in use, generate a new one
    // the math says this is like a one in a billion chance though, I think
    while (controller.resolveContract(cUuid)) {
        cUuid = randomUUID()
    }

    const sesh = getSession(req.jwt.unique_name)

    if (!sesh) {
        res.status(400).send("no session")
        return
    }

    const one = "1"
    const two = `${random.int(10, 99)}`
    const three = `${random.int(1_000_000, 9_999_999)}`
    const four = `${random.int(10, 99)}`

    const contractId = [one, two, three, four].join("-")
    const joined = [one, two, three, four].join("")

    // See my comment in contractRouting.ts about the Math.ceil call
    const timeLimit = Math.ceil(
        (sesh.timerEnd as number) - (sesh.timerStart as number),
    )
    const timeSeconds = timeLimit % 60
    const timeMinutes = Math.trunc(timeLimit / 60) % 60
    const timeHours = Math.trunc(timeLimit / 3600)
    const timeLimitStr = `${
        timeHours ? `${timeHours}:` : ""
    }${`0${timeMinutes}`.slice(-2)}:${`0${timeSeconds}`.slice(-2)}`

    res.json({
        template: createContractReturnTemplate,
        data: {
            Contract: {
                Title: {
                    $loc: {
                        key: "UI_CONTRACTS_UGC_TITLE",
                        data: [contractId],
                    },
                },
                Description: "UI_CONTRACTS_UGC_DESCRIPTION",
                Targets: Array.from(sesh.kills)
                    .filter((kill) =>
                        sesh.markedTargets.has(kill._RepositoryId || ""),
                    )
                    .map((km) => ({
                        RepositoryId: km._RepositoryId,
                        Selected: true,
                        Weapon: {
                            RepositoryId: km.KillItemRepositoryId,
                            KillMethodBroad: km.KillMethodBroad,
                            KillMethodStrict: km.KillMethodStrict,
                            RequiredKillMethodType: 3,
                        },
                        Outfit: {
                            RepositoryId: km.OutfitRepoId,
                            Required: true,
                            IsHitmanSuit: isSuit(km.OutfitRepoId),
                        },
                    })),
                ContractConditions: complications(timeLimitStr),
                PublishingDisabled:
                    sesh.contractId === contractCreationTutorialId,
                Creator: req.jwt.unique_name,
                ContractId: cUuid,
                ContractPublicId: joined,
            },
        },
    })
})

const createLoadSaveMiddleware =
    (menuTemplate: string) =>
    (
        req: RequestWithJwt<
            {
                sessionIds?: string
            },
            string[]
        >,
        res: Response,
    ) => {
        const template = getVersionedConfig(
            menuTemplate,
            req.gameVersion,
            false,
        )
        const doneContracts: string[] = []

        const response = {
            template,
            data: {
                Contracts: [] as UserCentricContract[],
                PaymentEligiblity: {} as Record<string, boolean>,
            },
        }

        for (const e of req.body) {
            if (e && !doneContracts.includes(e)) {
                doneContracts.push(e)

                const contract = controller.resolveContract(e)

                if (!contract) {
                    log(LogLevel.WARN, `Unknown contract in L/S: ${e}`)
                    continue
                }

                response.data.Contracts.push(
                    generateUserCentric(
                        contract,
                        req.jwt.unique_name,
                        req.gameVersion,
                    )!,
                )
            }
        }

        if (req.gameVersion === "h1") {
            for (const e of req.body) {
                if (e) {
                    response.data.PaymentEligiblity[e] = false
                }
            }
        } else {
            for (const sessionId of req.query.sessionIds?.split(",") || []) {
                response.data.PaymentEligiblity[sessionId] = false
            }
        }

        res.json(response)
    }

menuDataRouter.post(
    "/Load",
    jsonMiddleware(),
    // @ts-expect-error Has jwt props.
    createLoadSaveMiddleware("LoadMenuTemplate"),
)

menuDataRouter.post(
    "/Save",
    jsonMiddleware(),
    // @ts-expect-error Has jwt props.
    createLoadSaveMiddleware("SaveMenuTemplate"),
)

// @ts-expect-error Has jwt props.
menuDataRouter.get("/PlayerProfile", (req: RequestWithJwt, res) => {
    res.json({
        template: null,
        data: getPlayerProfileData(req.gameVersion, req.jwt.unique_name),
    })
})

menuDataRouter.get(
    // who at IOI decided this was a good route name???!
    "/LookupContractDialogAddOrDeleteFromPlaylist",
    // @ts-expect-error Has jwt props.
    withLookupDialog,
)

menuDataRouter.get(
    "/contractplaylist/addordelete/:contractId",
    // @ts-expect-error Has jwt props.
    directRoute,
)

menuDataRouter.post(
    "/contractplaylist/deletemultiple",
    jsonMiddleware(),
    // @ts-expect-error Has jwt props.
    deleteMultiple,
)

// @ts-expect-error Has jwt props.
menuDataRouter.get("/GetPlayerProfileXpData", (req: RequestWithJwt, res) => {
    const userData = getUserData(req.jwt.unique_name, req.gameVersion)

    res.json({
        template: null,
        data: {
            PlayerProfileXpData: {
                XP: userData.Extensions.progression.PlayerProfileXP.Total,
                Level: userData.Extensions.progression.PlayerProfileXP
                    .ProfileLevel,
                MaxLevel: getMaxProfileLevel(req.gameVersion),
            },
        },
    })
})

menuDataRouter.get(
    "/GetMasteryCompletionDataForLocation",
    // @ts-expect-error Has jwt props.
    (req: RequestWithJwt<GetCompletionDataForLocationQuery>, res) => {
        if (!req.query.locationId) {
            res.status(400).send("no location id")
            return
        }

        res.json(
            generateCompletionData(
                req.query.locationId,
                req.jwt.unique_name,
                req.gameVersion,
            ),
        )
    },
)

menuDataRouter.get(
    "/MasteryUnlockable",
    // @ts-expect-error Has jwt props.
    (req: RequestWithJwt<MasteryUnlockableQuery>, res) => {
        let masteryUnlockTemplate = getConfig(
            "MasteryUnlockablesTemplate",
            false,
        )

        const parentLocation = (() => {
            switch (req.query.unlockableId?.split("_").slice(0, 3).join("_")) {
                case "FIREARMS_SC_HERO":
                    return "LOCATION_PARENT_AUSTRIA"
                case "FIREARMS_SC_SEAGULL":
                    return "LOCATION_PARENT_SALTY"
                case "FIREARMS_SC_FALCON":
                    return "LOCATION_PARENT_CAGED"
                default:
                    assert.fail("fell through switch (bad query?)")
            }
        })()

        if (req.gameVersion === "scpc") {
            masteryUnlockTemplate = JSON.parse(
                JSON.stringify(masteryUnlockTemplate).replace(
                    /UI_MENU_PAGE_MASTERY_LEVEL_SHORT+/g,
                    "UI_MENU_PAGE_MASTERY_LEVEL",
                ),
            )

            // Do we still need to do this? - AF
            // sniperLoadout = JSON.parse(
            //     JSON.stringify(sniperLoadout).replace(/hawk\/+/g, ""),
            // )
        }

        res.json({
            template: masteryUnlockTemplate,
            data: controller.masteryService.getMasteryDataForSubPackage(
                parentLocation,
                req.query.unlockableId,
                req.gameVersion,
                req.jwt.unique_name,
            ),
        })
    },
)

menuDataRouter.get(
    "/MasteryDataForLocation",
    // @ts-expect-error Has jwt props.
    (
        req: RequestWithJwt<{
            locationId: string
        }>,
        res,
    ) => {
        res.json({
            template: getConfig("MasteryDataForLocationTemplate", false),
            data: controller.masteryService.getMasteryDataForLocation(
                req.query.locationId,
                req.gameVersion,
                req.jwt.unique_name,
            ),
        })
    },
)

menuDataRouter.get(
    "/GetMasteryCompletionDataForUnlockable",
    // @ts-expect-error Has jwt props.
    (req: RequestWithJwt<GetMasteryCompletionDataForUnlockableQuery>, res) => {
        res.json({
            template: null,
            data: {
                CompletionData: controller.masteryService.getLocationCompletion(
                    SNIPER_UNLOCK_TO_LOCATION[req.query.unlockableId],
                    SNIPER_UNLOCK_TO_LOCATION[req.query.unlockableId],
                    req.gameVersion,
                    req.jwt.unique_name,
                    "sniper",
                    req.query.unlockableId,
                ),
            },
        })
    },
)

export { menuDataRouter }
