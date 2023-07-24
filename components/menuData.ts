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

import { missionEnd } from "./scoreHandler"
import { Response, Router } from "express"
import {
    contractCreationTutorialId,
    gameDifficulty,
    getMaxProfileLevel,
    isSniperLocation,
    isSuit,
    PEACOCKVERSTRING,
    unlockOrderComparer,
    uuidRegex,
} from "./utils"
import { contractSessions, getSession } from "./eventHandler"
import { getConfig, getVersionedConfig } from "./configSwizzleManager"
import {
    contractIdToHitObject,
    controller,
    peacockRecentEscalations,
} from "./controller"
import { makeCampaigns } from "./menus/campaigns"
import {
    createLocationsData,
    destinationsMenu,
    getDestinationCompletion,
} from "./menus/destinations"
import type {
    ChallengeCategoryCompletion,
    CommonSelectScreenConfig,
    ContractSearchResult,
    GameVersion,
    HitsCategoryCategory,
    IHit,
    MissionManifest,
    PeacockLocationsData,
    PlayerProfileView,
    ProgressionData,
    RequestWithJwt,
    SafehouseCategory,
    SceneConfig,
    UserCentricContract,
} from "./types/types"
import { no2016 } from "./contracts/escalations/escalationService"
import {
    complications,
    generateCompletionData,
    generateUserCentric,
    getSubLocationByName,
} from "./contracts/dataGen"
import { log, LogLevel } from "./loggingInterop"
import {
    contractsModeHome,
    officialSearchContract,
} from "./contracts/contractsModeRouting"
import random from "random"
import { getUserData } from "./databaseHandler"
import {
    createMainOpportunityTile,
    createMenuPageTile,
    createPlayNextTile,
    getSeasonId,
    orderedMissions,
    orderedPZMissions,
    sniperMissionIds,
} from "./menus/playnext"
import { randomUUID } from "crypto"
import { planningView } from "./menus/planning"
import {
    deleteMultiple,
    directRoute,
    withLookupDialog,
} from "./menus/favoriteContracts"
import { swapToBrowsingMenusStatus } from "./discordRp"
import axios from "axios"
import { getFlag } from "./flags"
import { fakePlayerRegistry } from "./profileHandler"
import { createInventory, getUnlockableById } from "./inventory"
import { missionsInLocations } from "./contracts/missionsInLocation"
import { json as jsonMiddleware } from "body-parser"
import { hitsCategoryService } from "./contracts/hitsCategoryService"
import {
    GetCompletionDataForLocationQuery,
    MasteryUnlockableQuery,
    MissionEndRequestQuery,
    StashpointQuery,
} from "./types/gameSchemas"
import assert from "assert"

export const preMenuDataRouter = Router()
const menuDataRouter = Router()

// /profiles/page/

function dashEscalations(req: RequestWithJwt, res: Response) {
    const contracts: UserCentricContract[] = []

    for (const groupId of peacockRecentEscalations) {
        const userCentric = generateUserCentric(
            controller.resolveContract(groupId, true)!,
            req.jwt.unique_name,
            req.gameVersion,
        )

        if (!userCentric) {
            continue
        }

        contracts.push(userCentric)
    }

    res.json({
        template: null,
        data: {
            Item: {
                Id: req.params.id,
                Type: "ContractList",
                Title: "ContractList",
                Date: new Date().toISOString(),
                Data: contracts.length > 0 ? contracts : null,
            },
        },
    })
}

menuDataRouter.get(
    "/dashboard/Dashboard_Category_Escalation/:subscriptionId/:type/:id",
    dashEscalations,
)

menuDataRouter.get(
    "/dashboard/Dashboard_Category_Escalation/:subscriptionId/:type/:id/:mode",
    dashEscalations,
)

menuDataRouter.get(
    "/ChallengeLocation",
    (req: RequestWithJwt<{ locationId: string }>, res) => {
        if (typeof req.query.locationId !== "string") {
            res.status(400).send("Invalid locationId")
            return
        }

        const location = getVersionedConfig<PeacockLocationsData>(
            "LocationsData",
            req.gameVersion,
            true,
        ).children[req.query.locationId]

        res.json({
            template: getVersionedConfig(
                "ChallengeLocationTemplate",
                req.gameVersion,
                false,
            ),
            data: {
                Name: location.DisplayNameLocKey,
                Location: location,
                Children:
                    controller.challengeService.getChallengeDataForLocation(
                        req.query.locationId,
                        req.gameVersion,
                        req.jwt.unique_name,
                    ),
            },
        })
    },
)

menuDataRouter.get("/Hub", (req: RequestWithJwt, res) => {
    swapToBrowsingMenusStatus(req.gameVersion)
    const userdata = getUserData(req.jwt.unique_name, req.gameVersion)

    const theTemplate =
        req.gameVersion === "h3"
            ? null
            : req.gameVersion === "h2"
            ? null
            : req.gameVersion === "scpc"
            ? getConfig("FrankensteinHubTemplate", false)
            : getConfig("LegacyHubTemplate", false)

    const contractCreationTutorial =
        req.gameVersion !== "scpc"
            ? controller.resolveContract(contractCreationTutorialId)!
            : undefined

    const locations = getVersionedConfig<PeacockLocationsData>(
        "LocationsData",
        req.gameVersion,
        true,
    )
    const career =
        req.gameVersion === "h3"
            ? {}
            : {
                  // TODO: Add data on elusive challenges. They are only shown on the Career->Challenges page for H1 and H2. They are not supported by Peacock as of v6.0.0.
                  ELUSIVES_UNSUPPORTED: {
                      Children: [],
                      Name: "UI_MENU_PAGE_PROFILE_CHALLENGES_CATEGORY_ELUSIVE",
                      Location:
                          locations.parents["LOCATION_PARENT_ICA_FACILITY"],
                  },
              }

    const masteryData = []

    for (const parent in locations.parents) {
        career[parent] = {
            Children: [],
            Location: locations.parents[parent],
            Name: locations.parents[parent].DisplayNameLocKey,
        }

        // Exclude ICA Facility from showing in the Career -> Mastery page
        if (parent === "LOCATION_PARENT_ICA_FACILITY") continue

        if (
            controller.masteryService.getMasteryDataForDestination(
                parent,
                req.gameVersion,
                req.jwt.unique_name,
            ).length
        ) {
            const completionData =
                controller.masteryService.getLocationCompletion(
                    parent,
                    parent,
                    req.gameVersion,
                    req.jwt.unique_name,
                    parent.includes("SNUG") ? "evergreen" : "mission",
                    req.gameVersion === "h1" ? "normal" : undefined,
                )

            masteryData.push({
                CompletionData: completionData,
                ...(req.gameVersion === "h1"
                    ? {
                          Data: {
                              normal: {
                                  CompletionData: completionData,
                              },
                              pro1: {
                                  CompletionData:
                                      controller.masteryService.getLocationCompletion(
                                          parent,
                                          parent,
                                          req.gameVersion,
                                          req.jwt.unique_name,
                                          parent.includes("SNUG")
                                              ? "evergreen"
                                              : "mission",
                                          "pro1",
                                      ),
                              },
                          },
                      }
                    : {}),
                Id: locations.parents[parent].Id,
                Image: locations.parents[parent].Properties.Icon,
                IsLocked: locations.parents[parent].Properties.IsLocked,
                Location: locations.parents[parent],
                RequiredResources:
                    locations.parents[parent].Properties.RequiredResources,
            })
        }
    }

    for (const child in locations.children) {
        if (
            child === "LOCATION_ICA_FACILITY_ARRIVAL" ||
            child === "LOCATION_HOKKAIDO_SHIM_MAMUSHI" ||
            child.includes("SNUG_")
        ) {
            continue
        }

        const parent = locations.children[child].Properties.ParentLocation
        const location = locations.children[child]
        const challenges = controller.challengeService.getChallengesForLocation(
            child,
            req.gameVersion,
        )
        const challengeCompletion =
            controller.challengeService.countTotalNCompletedChallenges(
                challenges,
                req.jwt.unique_name,
                req.gameVersion,
            )

        career[parent]?.Children.push({
            IsLocked: location.Properties.IsLocked,
            Name: location.DisplayNameLocKey,
            Image: location.Properties.Icon,
            Icon: location.Type, // should be "location" for all locations
            CompletedChallengesCount:
                challengeCompletion.CompletedChallengesCount,
            ChallengesCount: challengeCompletion.ChallengesCount,
            CategoryId: child,
            Description: `UI_${child}_PRIMARY_DESC`,
            Location: location,
            ImageLocked: location.Properties.LockedIcon,
            RequiredResources: location.Properties.RequiredResources,
            IsPack: false, // should be false for all locations
            CompletionData: generateCompletionData(
                child,
                req.jwt.unique_name,
                req.gameVersion,
            ),
        })
    }

    res.json({
        template: theTemplate,
        data: {
            ServerTile: {
                title: "The Peacock Project",
                image: "images/contracts/novikov_and_magolis/tile.jpg",
                icon: "story",
                url: "",
                select: {
                    header: "Playing on a Peacock instance",
                    title: "The Peacock Project",
                    icon: "story",
                },
            },
            DashboardData: [],
            DestinationsData: destinationsMenu(req),
            CreateContractTutorial: generateUserCentric(
                contractCreationTutorial,
                req.jwt.unique_name,
                req.gameVersion,
            ),
            LocationsData: createLocationsData(req.gameVersion, true),
            ProfileData: {
                ChallengeData: {
                    Children: Object.values(career),
                },
                MasteryData: masteryData,
            },
            StoryData: makeCampaigns(req.gameVersion, req.jwt.unique_name),
            FilterData: getVersionedConfig(
                "FilterData",
                req.gameVersion,
                false,
            ),
            StoreData: getVersionedConfig("StoreData", req.gameVersion, false),
            IOIAccountStatus: {
                IsConfirmed: true,
                LinkedEmail: "mail@example.com",
                IOIAccountId: "00000000-0000-0000-0000-000000000000",
                IOIAccountBaseUrl: "https://account.ioi.dk",
            },
            FinishedFinalTest: true,
            Currency: {
                Balance: 0,
            },
            PlayerProfileXpData: {
                XP: userdata.Extensions.progression.PlayerProfileXP.Total,
                Level: userdata.Extensions.progression.PlayerProfileXP
                    .ProfileLevel,
                MaxLevel: getMaxProfileLevel(req.gameVersion),
            },
        },
    })
})

menuDataRouter.get("/SafehouseCategory", (req: RequestWithJwt, res) => {
    const inventory = createInventory(req.jwt.unique_name, req.gameVersion)

    const safehouseData = {
        template:
            req.gameVersion === "h1"
                ? getConfig("LegacySafehouseTemplate", false)
                : null,
        data: {
            Category: "_root",
            SubCategories: [],
            IsLeaf: false,
            Data: null,
        } as SafehouseCategory,
    }

    for (const item of inventory) {
        if (req.query.type) {
            // if type is specified in query
            if (item.Unlockable.Type !== req.query.type) {
                continue // skip all items that are not that type
            }

            if (
                req.query.subtype &&
                item.Unlockable.Subtype !== req.query.subtype
            ) {
                // if subtype is specified
                continue // skip all items that are not that subtype
            }
        } else if (
            item.Unlockable.Type === "access" ||
            item.Unlockable.Type === "location" ||
            item.Unlockable.Type === "package" ||
            item.Unlockable.Type === "loadoutunlock" ||
            item.Unlockable.Type === "difficultyunlock" ||
            item.Unlockable.Type === "agencypickup" ||
            item.Unlockable.Type === "challengemultiplier"
        ) {
            continue // these types should not be displayed when not asked for
        } else if (item.Unlockable.Properties.InclusionData) {
            // Only sniper unlockables have inclusion data, don't show them
            continue
        }

        if (
            item.Unlockable.Subtype === "disguise" &&
            req.gameVersion === "h3"
        ) {
            continue // I don't want to put this in that elif statement
        }

        let category = safehouseData.data.SubCategories.find(
            (cat) => cat.Category === item.Unlockable.Type,
        )
        let subcategory

        if (!category) {
            category = {
                Category: item.Unlockable.Type,
                SubCategories: [],
                IsLeaf: false,
                Data: null,
            }
            safehouseData.data.SubCategories.push(category)
        }

        subcategory = category.SubCategories.find(
            (cat) => cat.Category === item.Unlockable.Subtype,
        )

        if (!subcategory) {
            subcategory = {
                Category: item.Unlockable.Subtype,
                SubCategories: null,
                IsLeaf: true,
                Data: {
                    Type: item.Unlockable.Type,
                    SubType: item.Unlockable.Subtype,
                    Items: [],
                    Page: 0,
                    HasMore: false,
                },
            }
            category.SubCategories.push(subcategory)
        }

        subcategory.Data.Items.push({
            Item: item,
            ItemDetails: {
                Capabilities: [],
                StatList: item.Unlockable.Properties.Gameplay
                    ? Object.entries(item.Unlockable.Properties.Gameplay).map(
                          ([key, value]) => ({
                              Name: key,
                              Ratio: value,
                          }),
                      )
                    : [],
                PropertyTexts: [],
            },
            Type: item.Unlockable.Type,
            SubType: item.Unlockable.SubType,
        })
    }

    for (const [id, category] of safehouseData.data.SubCategories.entries()) {
        if (category.SubCategories.length === 1) {
            // if category only has one subcategory
            safehouseData.data.SubCategories[id] = category.SubCategories[0] // flatten it
            safehouseData.data.SubCategories[id].Category = category.Category // but keep the top category's name
        }
    }

    if (safehouseData.data.SubCategories.length === 1) {
        // if root has only one subcategory
        safehouseData.data = safehouseData.data.SubCategories[0] // flatten it
    }

    res.json(safehouseData)
})

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

menuDataRouter.get(
    "/stashpoint",
    (req: RequestWithJwt<StashpointQuery>, res) => {
        // Note: this is handled differently for 2016
        // /stashpoint?contractid=e5b6ccf4-1f29-4ec6-bfb8-2e9b78882c85&slotid=4&slotname=gear4&stashpoint=&allowlargeitems=true&allowcontainers=true
        // /stashpoint?contractid=c1d015b4-be08-4e44-808e-ada0f387656f&slotid=3&slotname=disguise3&stashpoint=&allowlargeitems=true&allowcontainers=true
        // /stashpoint?contractid=&slotid=3&slotname=disguise&stashpoint=&allowlargeitems=true&allowcontainers=false
        // /stashpoint?contractid=5b5f8aa4-ecb4-4a0a-9aff-98aa1de43dcc&slotid=6&slotname=stashpoint6&stashpoint=28b03709-d1f0-4388-b207-f03611eafb64&allowlargeitems=true&allowcontainers=false
        const stashData: {
            template: unknown
            data?: {
                SlotId?: string | number
                LoadoutItemsData?: unknown
                UserCentric?: UserCentricContract
                ShowSlotName?: string | number
            }
        } = {
            template: getVersionedConfig(
                "StashpointTemplate",
                req.gameVersion === "h1" ? "h1" : "h3",
                false,
            ),
        }

        if (
            typeof req.query.slotname !== "string" ||
            !(req.query.slotid ?? undefined)
        ) {
            res.status(400).send("invalid slot data")
            return
        }

        let contractData: MissionManifest | undefined = undefined

        if (req.query.contractid) {
            contractData = controller.resolveContract(req.query.contractid)
        }

        const inventory = createInventory(
            req.jwt.unique_name,
            req.gameVersion,
            getSubLocationByName(
                contractData?.Metadata.Location,
                req.gameVersion,
            ),
        )

        if (req.query.slotname.endsWith(req.query.slotid!.toString())) {
            req.query.slotname = req.query.slotname.slice(
                0,
                -req.query.slotid!.toString().length,
            ) // weird
        }

        stashData.data = {
            SlotId: req.query.slotid,
            LoadoutItemsData: {
                SlotId: req.query.slotid,
                Items: inventory
                    .filter((item) => {
                        if (
                            req.query.slotname === "gear" &&
                            contractData?.Peacock?.noGear === true
                        ) {
                            return false
                        }

                        if (
                            req.query.slotname === "concealedweapon" &&
                            contractData?.Peacock?.noCarriedWeapon === true
                        ) {
                            return false
                        }

                        if (
                            item.Unlockable.Subtype === "disguise" &&
                            req.gameVersion === "h3"
                        ) {
                            return false
                        }

                        return (
                            item.Unlockable.Properties.LoadoutSlot && // only display items
                            (!req.query.slotname ||
                                ((uuidRegex.test(req.query.slotid as string) || // container
                                    req.query.slotname === "stashpoint") && // stashpoint
                                    item.Unlockable.Properties.LoadoutSlot !==
                                        "disguise") || // container or stashpoint => display all items
                                item.Unlockable.Properties.LoadoutSlot ===
                                    req.query.slotname) && // else: display items for requested slot
                            (req.query.allowcontainers === "true" ||
                                !item.Unlockable.Properties.IsContainer) &&
                            (req.query.allowlargeitems === "true" ||
                                item.Unlockable.Properties.LoadoutSlot !==
                                    "carriedweapon") &&
                            item.Unlockable.Type !== "challengemultiplier" &&
                            !item.Unlockable.Properties.InclusionData
                        ) // not sure about this one
                    })
                    .map((item) => ({
                        Item: item,
                        ItemDetails: {
                            Capabilities: [],
                            StatList: item.Unlockable.Properties.Gameplay
                                ? Object.entries(
                                      item.Unlockable.Properties.Gameplay,
                                  ).map(([key, value]) => ({
                                      Name: key,
                                      Ratio: value,
                                  }))
                                : [],
                            PropertyTexts: [],
                        },
                        SlotId: req.query.slotid,
                        SlotName: null,
                    })),
                Page: 0,
                HasMore: false,
                HasMoreLeft: false,
                HasMoreRight: false,
                OptionalData: {
                    stashpoint: req.query.stashpoint || "",
                    AllowLargeItems: req.query.allowlargeitems,
                    AllowContainers: req.query.allowcontainers, // ?? true
                },
            },
            ShowSlotName: req.query.slotname,
        }

        if (contractData) {
            stashData.data.UserCentric = generateUserCentric(
                contractData,
                req.jwt.unique_name,
                req.gameVersion,
            )
        }

        res.json(stashData)
    },
)

menuDataRouter.get(
    "/missionrewards",
    (req: RequestWithJwt<{ contractSessionId: string }>, res) => {
        const { contractId } = getSession(req.jwt.unique_name)
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
                    contractData.Metadata.Location,
                    req.jwt.unique_name,
                    req.gameVersion,
                ),
            },
        })
    },
)

menuDataRouter.get(
    "/scoreoverview",
    async (req: RequestWithJwt<MissionEndRequestQuery>, res) => {
        const resJsonFunc = res.json

        res.json = function fakeJsonBind(input) {
            return resJsonFunc.call(this, {
                template: getConfig("ScoreOverviewTemplate", false),
                data: input.data.ScoreOverview,
            })
        }

        await missionEnd(req, res)
    },
)

menuDataRouter.get("/Planning", planningView)

menuDataRouter.get(
    "/selectagencypickup",
    (req: RequestWithJwt<{ contractId: string }>, res) => {
        const pickupData = getConfig<SceneConfig>("AgencyPickups", false)

        const selectagencypickup = {
            template: getVersionedConfig(
                "SelectAgencyPickupTemplate",
                req.gameVersion,
                false,
            ),
        } as CommonSelectScreenConfig

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

        if (!Object.prototype.hasOwnProperty.call(pickupData, scenePath)) {
            log(
                LogLevel.ERROR,
                `Could not find AgencyPickup data for ${scenePath}! This may cause an unhandled promise rejection.`,
            )
        }

        if (contractData.Peacock?.noAgencyPickupsActive === true) {
            selectagencypickup.data = {
                Unlocked: [],
                Contract: contractData,
                OrderedUnlocks: [],
                UserCentric: generateUserCentric(
                    contractData,
                    req.jwt.unique_name,
                    req.gameVersion,
                ),
            }

            res.json(selectagencypickup)
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

        selectagencypickup.data = {
            Unlocked: unlockedAgencyPickups.map(
                (unlockable) => unlockable.Properties.RepositoryId!,
            ),
            Contract: contractData,
            OrderedUnlocks: unlockedAgencyPickups
                .filter((unlockable) =>
                    pickupsInScene.includes(unlockable.Properties.RepositoryId),
                )
                .sort(unlockOrderComparer),
            UserCentric: generateUserCentric(
                contractData,
                req.jwt.unique_name,
                req.gameVersion,
            ),
        }

        res.json(selectagencypickup)
    },
)

menuDataRouter.get(
    "/selectentrance",
    (req: RequestWithJwt<{ contractId: string }>, res) => {
        const entranceData = getConfig<SceneConfig>("Entrances", false)

        const selectEntrance: CommonSelectScreenConfig = {
            template: getVersionedConfig(
                "SelectEntranceTemplate",
                req.gameVersion,
                true,
            ),
        }

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

        if (!Object.prototype.hasOwnProperty.call(entranceData, scenePath)) {
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

        selectEntrance.data = {
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
            ),
        }

        res.json(selectEntrance)
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

menuDataRouter.get("/missionend", missionEnd)

menuDataRouter.get("/scoreoverviewandunlocks", missionEnd)

menuDataRouter.get(
    "/Destination",
    (req: RequestWithJwt<{ locationId: string; difficulty?: string }>, res) => {
        const LOCATION = req.query.locationId

        const locData = getVersionedConfig<PeacockLocationsData>(
            "LocationsData",
            req.gameVersion,
            false,
        )

        const locationData = locData.parents[LOCATION]
        const masteryData =
            controller.masteryService.getMasteryDataForDestination(
                req.query.locationId,
                req.gameVersion,
                req.jwt.unique_name,
                req.query.difficulty,
            )

        const response = {
            template:
                req.gameVersion === "h1"
                    ? getConfig("LegacyDestinationTemplate", false)
                    : null,
            data: {
                Location: {},
                MissionData: {
                    ...getDestinationCompletion(locationData, undefined, req),
                    ...{ SubLocationMissionsData: [] },
                },
                ChallengeData: {
                    Children:
                        controller.challengeService.getChallengeDataForDestination(
                            req.query.locationId,
                            req.gameVersion,
                            req.jwt.unique_name,
                        ),
                },
                MasteryData:
                    LOCATION !== "LOCATION_PARENT_ICA_FACILITY"
                        ? req.gameVersion === "h1"
                            ? masteryData[0]
                            : masteryData
                        : {},
                DifficultyData: undefined,
            },
        }

        if (
            req.gameVersion === "h1" &&
            LOCATION !== "LOCATION_PARENT_ICA_FACILITY"
        ) {
            const inventory = createInventory(
                req.jwt.unique_name,
                req.gameVersion,
            )

            response.data.DifficultyData = {
                AvailableDifficultyModes: [
                    {
                        Name: "normal",
                        Available: true,
                    },
                    {
                        Name: "pro1",
                        Available: inventory.some(
                            (e) =>
                                e.Unlockable.Id ===
                                locationData.Properties.DifficultyUnlock.pro1,
                        ),
                    },
                ],
                Difficulty: req.query.difficulty,
                LocationId: LOCATION,
            }
        }

        if (PEACOCK_DEV) {
            log(LogLevel.DEBUG, `Looking up locations details for ${LOCATION}.`)
        }

        const sublocationsData = Object.values(locData.children).filter(
            (subLocation) => subLocation.Properties.ParentLocation === LOCATION,
        )

        response.data.Location = locationData

        if (req.query.difficulty === "pro1") {
            const obj = {
                Location: locationData,
                SubLocation: locationData,
                Missions: [controller.missionsInLocations.pro1[LOCATION]].map(
                    (id) =>
                        contractIdToHitObject(
                            id,
                            req.gameVersion,
                            req.jwt.unique_name,
                        ),
                ),
                SarajevoSixMissions: [],
                ElusiveMissions: [],
                EscalationMissions: [],
                SniperMissions: [],
                PlaceholderMissions: [],
                CampaignMissions: [],
                CompletionData: generateCompletionData(
                    sublocationsData[0].Id,
                    req.jwt.unique_name,
                    req.gameVersion,
                ),
            }

            response.data.MissionData.SubLocationMissionsData.push(obj)

            res.json(response)
            return
        }

        for (const e of sublocationsData) {
            log(LogLevel.DEBUG, `Looking up sublocation details for ${e.Id}`)

            const escalations: IHit[] = []

            // every unique escalation from the sublocation
            const allUniqueEscalations: string[] = [
                ...(req.gameVersion === "h1" && e.Id === "LOCATION_ICA_FACILITY"
                    ? controller.missionsInLocations.escalations[
                          "LOCATION_ICA_FACILITY_SHIP"
                      ]
                    : []),
                ...new Set<string>(
                    controller.missionsInLocations.escalations[e.Id] || [],
                ),
            ]

            for (const escalation of allUniqueEscalations) {
                if (req.gameVersion === "h1" && no2016.includes(escalation))
                    continue

                const details = contractIdToHitObject(
                    escalation,
                    req.gameVersion,
                    req.jwt.unique_name,
                )

                if (details) {
                    escalations.push(details)
                }
            }

            const sniperMissions: IHit[] = []

            for (const sniperMission of controller.missionsInLocations.sniper[
                e.Id
            ] ?? []) {
                sniperMissions.push(
                    contractIdToHitObject(
                        sniperMission,
                        req.gameVersion,
                        req.jwt.unique_name,
                    ),
                )
            }

            const obj = {
                Location: locationData,
                SubLocation: e,
                Missions: [],
                SarajevoSixMissions: [],
                ElusiveMissions: [],
                EscalationMissions: escalations,
                SniperMissions: sniperMissions,
                PlaceholderMissions: [],
                CampaignMissions: [],
                CompletionData: generateCompletionData(
                    e.Id,
                    req.jwt.unique_name,
                    req.gameVersion,
                ),
            }

            const types = [
                ...[
                    [undefined, "Missions"],
                    ["elusive", "ElusiveMissions"],
                ],
                ...(req.gameVersion === "h1" ||
                (req.gameVersion === "h3" &&
                    missionsInLocations.sarajevo["h3enabled"])
                    ? [["sarajevo", "SarajevoSixMissions"]]
                    : []),
            ]

            for (const t of types) {
                let theMissions = !t[0] // no specific type
                    ? controller.missionsInLocations[e.Id]
                    : controller.missionsInLocations[t[0]][e.Id]

                // edge case: ica facility in h1 was only 1 sublocation, so we merge
                // these into a single array
                if (
                    req.gameVersion === "h1" &&
                    !t[0] &&
                    LOCATION === "LOCATION_PARENT_ICA_FACILITY"
                ) {
                    theMissions = [
                        ...controller.missionsInLocations
                            .LOCATION_ICA_FACILITY_ARRIVAL,
                        ...controller.missionsInLocations
                            .LOCATION_ICA_FACILITY_SHIP,
                        ...controller.missionsInLocations.LOCATION_ICA_FACILITY,
                    ]
                }

                if (theMissions !== undefined) {
                    ;(theMissions as string[])
                        .filter(
                            // removes snow festival on h1
                            (m) =>
                                m &&
                                !(
                                    req.gameVersion === "h1" &&
                                    m === "c414a084-a7b9-43ce-b6ca-590620acd87e"
                                ),
                        )
                        .forEach((c) => {
                            const mission = contractIdToHitObject(
                                c,
                                req.gameVersion,
                                req.jwt.unique_name,
                            )

                            obj[t[1]].push(mission)
                        })
                }
            }

            response.data.MissionData.SubLocationMissionsData.push(obj)
        }

        res.json(response)
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
    async (req: RequestWithJwt<{ publicid: string }>, res) => {
        if (!req.query.publicid || typeof req.query.publicid !== "string") {
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
    async (
        req: RequestWithJwt<{ type: string; page?: number | string }>,
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
    (req: RequestWithJwt<{ contractId: string }>, res) => {
        if (!req.query.contractId) {
            res.status(400).send("no contract id!")
            return
        }

        const cats = []

        const currentIdIndex = orderedMissions.indexOf(req.query.contractId)

        if (
            currentIdIndex !== -1 &&
            currentIdIndex !== orderedMissions.length - 1
        ) {
            const nextMissionId = orderedMissions[currentIdIndex + 1]
            const nextSeasonId = getSeasonId(currentIdIndex + 1)

            let shouldContinue = true

            // nextSeasonId > gameVersion's integer
            if (parseInt(nextSeasonId) > parseInt(req.gameVersion[1])) {
                shouldContinue = false
            }

            if (shouldContinue) {
                cats.push(
                    createPlayNextTile(
                        req.jwt.unique_name,
                        nextMissionId,
                        req.gameVersion,
                        {
                            CampaignName: `UI_SEASON_${nextSeasonId}`,
                        },
                    ),
                )
            }

            cats.push(createMainOpportunityTile(req.query.contractId))
        }

        const pzIdIndex = orderedPZMissions.indexOf(req.query.contractId)

        if (pzIdIndex !== -1 && pzIdIndex !== orderedPZMissions.length - 1) {
            const nextMissionId = orderedPZMissions[pzIdIndex + 1]
            cats.push(
                createPlayNextTile(
                    req.jwt.unique_name,
                    nextMissionId,
                    req.gameVersion,
                    {
                        CampaignName: "UI_CONTRACT_CAMPAIGN_WHITE_SPIDER_TITLE",
                        ParentCampaignName: "UI_MENU_PAGE_SIDE_MISSIONS_TITLE",
                    },
                ),
            )
        }

        if (req.query.contractId === "f1ba328f-e3dd-4ef8-bb26-0363499fdd95") {
            const nextMissionId = "0b616e62-af0c-495b-82e3-b778e82b5912"
            cats.push(
                createPlayNextTile(
                    req.jwt.unique_name,
                    nextMissionId,
                    req.gameVersion,
                    {
                        CampaignName: "UI_MENU_PAGE_SPECIAL_ASSIGNMENTS_TITLE",
                        ParentCampaignName: "UI_MENU_PAGE_SIDE_MISSIONS_TITLE",
                    },
                ),
            )
        }

        if (sniperMissionIds.includes(req.query.contractId)) {
            cats.push(createMenuPageTile("sniper"))
        }

        const pluginData = controller.hooks.getNextCampaignMission.call(
            req.query.contractId,
            req.gameVersion,
        )

        if (pluginData) {
            if (pluginData.overrideIndex !== undefined) {
                cats[pluginData.overrideIndex] = createPlayNextTile(
                    req.jwt.unique_name,
                    pluginData.nextContractId,
                    req.gameVersion,
                    pluginData.campaignDetails,
                )
            } else {
                cats.push(
                    createPlayNextTile(
                        req.jwt.unique_name,
                        pluginData.nextContractId,
                        req.gameVersion,
                        pluginData.campaignDetails,
                    ),
                )
            }
        }

        res.json({
            template: getConfig("PlayNextTemplate", false),
            data: {
                Categories: cats,
                ProfileId: req.jwt.unique_name,
            },
        })
    },
)

menuDataRouter.get("/LeaderboardsView", (req, res) => {
    res.json({
        template: getConfig("LeaderboardsViewTemplate", false),
        data: {
            LeaderboardUrl: "leaderboardentries",
            LeaderboardType: "singleplayer",
        },
    })
})

const leaderboardEntries = async (
    req: RequestWithJwt<{ contractid: string; difficultyLevel?: string }>,
    res: Response,
) => {
    let difficulty = "unset"

    const parsedDifficulty = parseInt(req.query?.difficultyLevel || "0")

    if (parsedDifficulty === gameDifficulty.casual) {
        difficulty = "casual"
    }

    if (parsedDifficulty === gameDifficulty.normal) {
        difficulty = "normal"
    }

    if (parsedDifficulty === gameDifficulty.master) {
        difficulty = "master"
    }

    const response = {
        template: getConfig("LeaderboardEntriesTemplate", false),
        data: {
            Entries: [] as ApiLeaderboardEntry[],
            Contract: controller.resolveContract(req.query.contractid),
            Page: 0,
            HasMore: false,
            LeaderboardType: "singleplayer",
        },
    }

    type ApiLeaderboardEntry = {
        LeaderboardData: {
            Player: {
                displayName: string
            }
        }
        gameVersion: {
            id: number
            name: string
        }
        platformId: string
        platform: {
            id: number
            name: string
        }
    }

    const entries = (
        await axios.post<ApiLeaderboardEntry[]>(
            `${getFlag("leaderboardsHost")}/leaderboards/entries/${
                req.query.contractid
            }`,
            {
                gameVersion: req.gameVersion,
                difficulty,
                platform: req.jwt.platform,
            },
            {
                headers: {
                    "Peacock-Version": PEACOCKVERSTRING,
                },
            },
        )
    ).data

    const ids: readonly string[] = entries.map((te) =>
        fakePlayerRegistry.index(
            te.LeaderboardData.Player.displayName,
            te.platform.name,
            te.platformId,
        ),
    )

    entries.forEach((entry, index) => {
        // @ts-expect-error Remapping on different types
        entry.LeaderboardData.Player = ids[index]
        return entry
    })

    response.data.Entries = entries

    res.json(response)
}

menuDataRouter.get("/LeaderboardEntries", leaderboardEntries)

menuDataRouter.get(
    "/DebriefingLeaderboards",
    async (
        req: RequestWithJwt<{ contractid: string; difficulty?: string }>,
        res,
    ) => {
        const debriefingLeaderboardsTemplate = getConfig(
            "DebriefingLeaderboardsTemplate",
            false,
        )

        const resJsonFunc = res.json

        res.json = function (input) {
            return resJsonFunc.call(this, {
                template: debriefingLeaderboardsTemplate,
                data: input.data,
            })
        }

        await leaderboardEntries(req, res)
    },
)

menuDataRouter.get("/Contracts", contractsModeHome)

preMenuDataRouter.get(
    "/contractcreation/planning",
    (
        req: RequestWithJwt<{ contractCreationIdOverwrite: string }>,
        res,
        next,
    ) => {
        const createContractPlanningTemplate = getConfig(
            "CreateContractPlanningTemplate",
            false,
        )

        req.url = "/Planning"
        req.query.contractid = req.query.contractCreationIdOverwrite
        req.query.resetescalation = "false"

        const originalJsonFunc = res.json

        res.json = function (originalData) {
            const d = originalData.data

            // create contract planning isn't supposed to have the following properties
            for (const key of [
                "ElusiveContractState",
                "UserCentric",
                "UserContract",
                "UnlockedEntrances",
                "UnlockedAgencyPickups",
                "Objectives",
                "CharacterLoadoutData",
                "ChallengeData",
                "Currency",
                "PaymentDetails",
                "OpportunityData",
                "PlayerProfileXpData",
            ]) {
                d[key] = undefined
            }

            return originalJsonFunc.call(this, {
                template: createContractPlanningTemplate,
                data: d,
            })
        }

        next("router")
    },
)

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
    async (req: RequestWithJwt<{ sorting?: unknown }, string[]>, res) => {
        const specialContracts: string[] = []

        await controller.hooks.getSearchResults.callAsync(
            req.body,
            specialContracts,
        )

        let searchResult: ContractSearchResult

        if (specialContracts.length > 0) {
            // Handled by a plugin

            const contracts: { UserCentricContract: UserCentricContract }[] = []

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
            searchResult = await officialSearchContract(
                req.jwt.unique_name,
                req.gameVersion,
                req.body,
                0,
            )
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
    async (req: RequestWithJwt<{ page: number }, string[]>, res) => {
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
    (req: RequestWithJwt<{ contractId: string }>, res) => {
        res.json({
            template: getConfig("DebriefingChallengesTemplate", false),
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
                        sesh.markedTargets.has(kill._RepositoryId),
                    )
                    .map((km) => {
                        return {
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
                        }
                    }),
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
                PaymentEligiblity: {},
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
    createLoadSaveMiddleware("LoadMenuTemplate"),
)

menuDataRouter.post(
    "/Save",
    jsonMiddleware(),
    createLoadSaveMiddleware("SaveMenuTemplate"),
)

menuDataRouter.get("/PlayerProfile", (req: RequestWithJwt, res) => {
    const playerProfilePage = getConfig<PlayerProfileView>(
        "PlayerProfilePage",
        true,
    )

    const locationData = getVersionedConfig<PeacockLocationsData>(
        "LocationsData",
        req.gameVersion,
        false,
    )

    playerProfilePage.data.SubLocationData = []

    for (const subLocationKey in locationData.children) {
        // Ewww...
        if (
            subLocationKey === "LOCATION_ICA_FACILITY_ARRIVAL" ||
            subLocationKey === "LOCATION_HOKKAIDO_SHIM_MAMUSHI" ||
            subLocationKey.includes("SNUG_")
        ) {
            continue
        }

        const subLocation = locationData.children[subLocationKey]
        const parentLocation =
            locationData.parents[subLocation.Properties.ParentLocation]

        const completionData = generateCompletionData(
            subLocation.Id,
            req.jwt.unique_name,
            req.gameVersion,
        )

        // TODO: Make getDestinationCompletion do something like this.
        const challenges = controller.challengeService.getChallengesForLocation(
            subLocation.Id,
            req.gameVersion,
        )

        const challengeCategoryCompletion: ChallengeCategoryCompletion[] = []

        for (const challengeGroup in challenges) {
            const challengeCompletion =
                controller.challengeService.countTotalNCompletedChallenges(
                    {
                        challengeGroup: challenges[challengeGroup],
                    },
                    req.jwt.unique_name,
                    req.gameVersion,
                )

            challengeCategoryCompletion.push({
                Name: challenges[challengeGroup][0].CategoryName,
                ...challengeCompletion,
            })
        }

        const destinationCompletion = getDestinationCompletion(
            parentLocation,
            subLocation,
            req,
        )

        playerProfilePage.data.SubLocationData.push({
            ParentLocation: parentLocation,
            Location: subLocation,
            CompletionData: completionData,
            ChallengeCategoryCompletion: challengeCategoryCompletion,
            ChallengeCompletion: destinationCompletion.ChallengeCompletion,
            OpportunityStatistics: destinationCompletion.OpportunityStatistics,
            LocationCompletionPercent:
                destinationCompletion.LocationCompletionPercent,
        })
    }

    const userProfile = getUserData(req.jwt.unique_name, req.gameVersion)
    playerProfilePage.data.PlayerProfileXp.Total =
        userProfile.Extensions.progression.PlayerProfileXP.Total
    playerProfilePage.data.PlayerProfileXp.Level =
        userProfile.Extensions.progression.PlayerProfileXP.ProfileLevel

    const subLocationMap = new Map(
        userProfile.Extensions.progression.PlayerProfileXP.Sublocations.map(
            (obj) => [obj.Location, obj],
        ),
    )

    playerProfilePage.data.PlayerProfileXp.Seasons.forEach((e) =>
        e.Locations.forEach((f) => {
            const subLocationData = subLocationMap.get(f.LocationId)

            f.Xp = subLocationData?.Xp || 0
            f.ActionXp = subLocationData?.ActionXp || 0

            if (f.LocationProgression && !isSniperLocation(f.LocationId)) {
                // We typecast below as it could be an object for subpackages.
                // Checks before this ensure it isn't, but TS doesn't realise this.
                f.LocationProgression.Level =
                    (
                        userProfile.Extensions.progression.Locations[
                            f.LocationId
                        ] as ProgressionData
                    ).Level || 1
            }
        }),
    )

    res.json(playerProfilePage)
})

menuDataRouter.get(
    // who at IOI decided this was a good route name???!
    "/LookupContractDialogAddOrDeleteFromPlaylist",
    withLookupDialog,
)

menuDataRouter.get(
    // this one is sane Kappa
    "/contractplaylist/addordelete/:contractId",
    directRoute,
)

menuDataRouter.post(
    "/contractplaylist/deletemultiple",
    jsonMiddleware(),
    deleteMultiple,
)

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
    (req: RequestWithJwt<GetCompletionDataForLocationQuery>, res) => {
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
            data: {
                ...controller.masteryService.getMasteryDataForSubPackage(
                    parentLocation,
                    req.query.unlockableId,
                    req.gameVersion,
                    req.jwt.unique_name,
                ),
            },
        })
    },
)

menuDataRouter.get(
    "/MasteryDataForLocation",
    (req: RequestWithJwt<{ locationId: string }>, res) => {
        res.json(
            controller.masteryService.getMasteryDataForLocation(
                req.query.locationId,
                req.gameVersion,
                req.jwt.unique_name,
            ),
        )
    },
)

menuDataRouter.get(
    "/GetMasteryCompletionDataForUnlockable",
    (req: RequestWithJwt<{ unlockableId: string }>, res) => {
        // We make this lookup table to quickly get it, there's no other quick way for it.
        const unlockToLoc = {
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

        res.json({
            template: null,
            data: {
                CompletionData: controller.masteryService.getLocationCompletion(
                    unlockToLoc[req.query.unlockableId],
                    unlockToLoc[req.query.unlockableId],
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
