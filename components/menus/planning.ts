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

import type { MissionStory, RequestWithJwt, SceneConfig } from "../types/types"
import { log, LogLevel } from "../loggingInterop"
import { _legacyBull, _theLastYardbirdScpc, controller } from "../controller"
import {
    escalationTypes,
    getLevelCount,
    getUserEscalationProgress,
    resetUserEscalationProgress,
} from "../contracts/escalations/escalationService"
import {
    generateUserCentric,
    getSubLocationFromContract,
    mapObjectives,
} from "../contracts/dataGen"
import { getConfig } from "../configSwizzleManager"
import { getUserData, writeUserData } from "../databaseHandler"
import {
    getDefaultSuitFor,
    getMaxProfileLevel,
    getRemoteService,
    nilUuid,
    unlockOrderComparer,
} from "../utils"

import type { Response } from "express"
import { createInventory, getUnlockableById } from "../inventory"
import { createSniperLoadouts } from "./sniper"
import { getFlag } from "../flags"
import { loadouts } from "../loadouts"
import { resolveProfiles } from "../profileHandler"
import { PlanningQuery } from "../types/gameSchemas"
import { userAuths } from "../officialServerAuth"

export async function planningView(
    req: RequestWithJwt<PlanningQuery>,
    res: Response,
): Promise<void> {
    if (!req.query.contractid || !req.query.resetescalation) {
        res.status(400).send("invalid query")
        return
    }

    const entranceData = getConfig<SceneConfig>("Entrances", false)
    const missionStories = getConfig<Record<string, MissionStory>>(
        "MissionStories",
        false,
    )

    const userData = getUserData(req.jwt.unique_name, req.gameVersion)

    const isForReset = req.query.resetescalation === "true"

    for (const ms in userData.Extensions.opportunityprogression) {
        if (Object.keys(missionStories).includes(ms)) {
            missionStories[ms].PreviouslyCompleted = true
        }
    }

    let contractData =
        req.gameVersion === "h1" &&
        req.query.contractid === "42bac555-bbb9-429d-a8ce-f1ffdf94211c"
            ? _legacyBull
            : req.query.contractid === "ff9f46cf-00bd-4c12-b887-eac491c3a96d"
            ? _theLastYardbirdScpc
            : controller.resolveContract(req.query.contractid)

    if (isForReset) {
        const escalationGroupId =
            contractData.Metadata.InGroup ?? contractData.Metadata.Id

        resetUserEscalationProgress(userData, escalationGroupId)

        writeUserData(req.jwt.unique_name, req.gameVersion)

        // now reassign properties and continue
        req.query.contractid =
            controller.escalationMappings.get(escalationGroupId)["1"]

        contractData = controller.resolveContract(req.query.contractid)
    }

    if (!contractData) {
        // This will only happen for **contracts** that are meant to be fetched from the official servers.
        // E.g. trending contracts, most played last week, etc.
        // This will also fetch a contract if the player has downloaded it before but deleted the files.
        // E.g. the user adds a contract to favorites, then deletes the files, then tries to load the contract again.
        log(
            LogLevel.WARN,
            `Trying to download contract ${req.query.contractid} due to it not found locally.`,
        )
        const user = userAuths.get(req.jwt.unique_name)
        const resp = await user._useService(
            `https://${getRemoteService(
                req.gameVersion,
            )}.hitman.io/profiles/page/Planning?contractid=${
                req.query.contractid
            }&resetescalation=false&forcecurrentcontract=false&errorhandling=false`,
            true,
        )

        contractData = resp.data.data.Contract
        controller.fetchedContracts.set(contractData.Metadata.Id, contractData)
    }

    if (!contractData) {
        log(LogLevel.ERROR, `Not found: ${req.query.contractid}, .`)
        res.status(400).send("no ct")
        return
    }

    const groupData = {
        GroupId: undefined as string | undefined,
        GroupTitle: undefined as string | undefined,
        CompletedLevels: undefined as number | undefined,
        Completed: undefined as boolean | undefined,
        TotalLevels: undefined as number | undefined,
        BestScore: undefined as number | undefined,
        BestPlayer: undefined as string | undefined,
        BestLevel: undefined as number | undefined,
    }

    const escalation = escalationTypes.includes(contractData.Metadata.Type)

    // It is possible for req.query.contractid to be the id of a group OR a level in that group.
    let escalationGroupId =
        contractData.Metadata.InGroup ?? contractData.Metadata.Id

    if (escalation) {
        const groupContractData = controller.resolveContract(escalationGroupId)

        const p = getUserEscalationProgress(userData, escalationGroupId)

        const done =
            userData.Extensions.PeacockCompletedEscalations.includes(
                escalationGroupId,
            )

        groupData.GroupId = escalationGroupId
        groupData.GroupTitle = groupContractData.Metadata.Title
        groupData.CompletedLevels = done ? p : p - 1
        groupData.Completed = done
        groupData.TotalLevels = getLevelCount(groupContractData)
        groupData.BestScore = 0
        groupData.BestPlayer = nilUuid
        groupData.BestLevel = 0

        // Fix contractData to the data of the level in the group.
        if (!contractData.Metadata.InGroup) {
            contractData = controller.resolveContract(
                contractData.Metadata.GroupDefinition.Order[p - 1],
            )
        }
    }

    if (!contractData) {
        log(LogLevel.WARN, `Unknown contract: ${req.query.contractid}`)
        res.status(404).send("contract not found!")
        return
    }

    const creatorProfile = (
        await resolveProfiles(
            [
                contractData.Metadata.CreatorUserId || "",
                "fadb923c-e6bb-4283-a537-eb4d1150262e",
            ],
            req.gameVersion,
        )
    )[0]

    const scenePath = contractData.Metadata.ScenePath.toLowerCase()

    log(
        LogLevel.DEBUG,
        `Looking up details for contract - Location:${contractData.Metadata.Location} (${scenePath})`,
    )

    const sublocation = getSubLocationFromContract(
        contractData,
        req.gameVersion,
    )

    if (!Object.prototype.hasOwnProperty.call(entranceData, scenePath)) {
        log(
            LogLevel.ERROR,
            `Could not find Entrance data for ${scenePath} (loc Planning)! This may cause an unhandled promise rejection.`,
        )
    }

    const entrancesInScene = entranceData[scenePath]

    const typedInv = createInventory(
        req.jwt.unique_name,
        req.gameVersion,
        sublocation,
    )

    const unlockedEntrances = typedInv
        .filter((item) => item.Unlockable.Type === "access")
        .map((i) => i.Unlockable)
        .filter((unlockable) => unlockable.Properties.RepositoryId)

    if (!unlockedEntrances) {
        log(
            LogLevel.ERROR,
            "No matching entrance data found in planning, this is a bug!",
        )
    }

    sublocation.DisplayNameLocKey = `UI_${sublocation.Id}_NAME`

    // Default loadout

    let currentLoadout = loadouts.getLoadoutFor(req.gameVersion)

    if (!currentLoadout) {
        currentLoadout = loadouts.createDefault(req.gameVersion)
    }

    let pistol = "FIREARMS_HERO_PISTOL_TACTICAL_ICA_19"
    let suit = getDefaultSuitFor(sublocation)
    let tool1 = "TOKEN_FIBERWIRE"
    let tool2 = "PROP_TOOL_COIN"
    let briefcaseProp: string | undefined = undefined
    let briefcaseId: string | undefined = undefined

    const hasOwn = Object.prototype.hasOwnProperty.bind(currentLoadout.data)

    const dlForLocation =
        getFlag("loadoutSaving") === "LEGACY"
            ? // older default loadout setting (per-person)
              userData.Extensions.defaultloadout?.[
                  contractData.Metadata.Location
              ]
            : // new loadout profiles system
              hasOwn(contractData.Metadata.Location) &&
              currentLoadout.data[contractData.Metadata.Location]

    if (dlForLocation) {
        pistol = dlForLocation["2"]
        suit = dlForLocation["3"]
        tool1 = dlForLocation["4"]
        tool2 = dlForLocation["5"]

        for (const key of Object.keys(dlForLocation)) {
            if (["2", "3", "4", "5"].includes(key)) {
                // we're looking for keys that aren't taken up by other things
                continue
            }

            briefcaseId = key
            briefcaseProp = dlForLocation[key]
        }
    }

    const i = typedInv.find((item) => item.Unlockable.Id === briefcaseProp)

    const userCentric = generateUserCentric(
        contractData,
        req.jwt.unique_name,
        req.gameVersion,
    )

    const sniperLoadouts = createSniperLoadouts(
        req.jwt.unique_name,
        req.gameVersion,
        contractData,
    )

    if (req.gameVersion === "scpc") {
        sniperLoadouts.forEach((loadout) => {
            loadout["LoadoutData"] = loadout["Loadout"]["LoadoutData"]
            delete loadout["Loadout"]
        })
    }

    let loadoutSlots = [
        {
            SlotName: "carriedweapon",
            SlotId: "0",
            Recommended: null,
        },
        {
            SlotName: "carrieditem",
            SlotId: "1",
            Recommended: null,
        },
        {
            SlotName: "concealedweapon",
            SlotId: "2",
            Recommended: {
                item:
                    contractData.Peacock?.noCarriedWeapon === true
                        ? null
                        : typedInv.find(
                              (item) => item.Unlockable.Id === pistol,
                          ),
                type: "concealedweapon",
            },
        },
        {
            SlotName: "disguise",
            SlotId: "3",
            Recommended: {
                item: typedInv.find((item) => item.Unlockable.Id === suit),
                type: "disguise",
            },
        },
        {
            SlotName: "gear",
            SlotId: "4",
            Recommended: {
                item:
                    contractData.Peacock?.noGear === true
                        ? null
                        : typedInv.find((item) => item.Unlockable.Id === tool1),
                type: "gear",
            },
        },
        {
            SlotName: "gear",
            SlotId: "5",
            Recommended: {
                item:
                    contractData.Peacock?.noGear === true
                        ? null
                        : typedInv.find((item) => item.Unlockable.Id === tool2),
                type: "gear",
            },
        },
        {
            SlotName: "stashpoint",
            SlotId: "6",
            Recommended: null,
        },
        briefcaseId && {
            SlotName: briefcaseProp,
            SlotId: briefcaseId,
            Recommended: {
                item: {
                    ...i,
                    Properties: {},
                },
                type: i.Unlockable.Id,
                owned: true,
            },
            IsContainer: true,
        },
    ].filter(Boolean)

    /**
     * Handles loadout lock for Miami and Hokkaido
     */
    const limitedLoadoutUnlockLevelMap = {
        LOCATION_MIAMI: 2,
        LOCATION_HOKKAIDO: 20,
        LOCATION_HOKKAIDO_SHIM_MAMUSHI: 20,
    }

    if (
        sublocation?.Properties?.LimitedLoadout &&
        getFlag("enableMasteryProgression")
    ) {
        const loadoutUnlockable = getUnlockableById(
            req.gameVersion === "h1"
                ? sublocation?.Properties?.NormalLoadoutUnlock[
                      contractData.Metadata.Difficulty ?? "normal"
                  ]
                : sublocation?.Properties?.NormalLoadoutUnlock,
            req.gameVersion,
        )

        if (loadoutUnlockable) {
            const loadoutMasteryData =
                controller.masteryService.getMasteryForUnlockable(
                    loadoutUnlockable,
                    req.gameVersion,
                )

            const locationProgression =
                loadoutMasteryData &&
                (loadoutMasteryData.SubPackageId
                    ? userData.Extensions.progression.Locations[
                          loadoutMasteryData.Location
                      ][loadoutMasteryData.SubPackageId]
                    : userData.Extensions.progression.Locations[
                          loadoutMasteryData.Location
                      ])

            if (locationProgression.Level < loadoutMasteryData.Level)
                loadoutSlots = loadoutSlots.filter(
                    (slot) => !["2", "4", "5"].includes(slot.SlotId),
                )
        }
    }

    res.json({
        template:
            req.gameVersion === "h1"
                ? getConfig("LegacyPlanningTemplate", false)
                : req.gameVersion === "scpc"
                ? getConfig("FrankensteinPlanningTemplate", false)
                : null,
        data: {
            Contract: contractData,
            ElusiveContractState: "not_completed",
            UserCentric: userCentric,
            IsFirstInGroup: escalation ? groupData.CompletedLevels === 0 : true,
            Creator: creatorProfile,
            UserContract: creatorProfile.DevId !== "IOI",
            UnlockedEntrances:
                contractData.Metadata.Type === "sniper"
                    ? null
                    : typedInv
                          .filter(
                              (item) =>
                                  item.Unlockable.Subtype ===
                                  "startinglocation",
                          )
                          .filter(
                              (item) =>
                                  item.Unlockable.Properties.Difficulty ===
                                  contractData.Metadata.Difficulty,
                          )
                          .map((i) => i.Unlockable.Properties.RepositoryId)
                          .filter((id) => id),
            UnlockedAgencyPickups:
                contractData.Metadata.Type === "sniper"
                    ? null
                    : typedInv
                          .filter(
                              (item) => item.Unlockable.Type === "agencypickup",
                          )
                          .filter(
                              (item) =>
                                  item.Unlockable.Properties.Difficulty ===
                                  contractData.Metadata.Difficulty,
                          )
                          .map((i) => i.Unlockable.Properties.RepositoryId)
                          .filter((id) => id),
            Objectives: mapObjectives(
                contractData.Data.Objectives,
                contractData.Data.GameChangers || [],
                contractData.Metadata.GroupObjectiveDisplayOrder || [],
                contractData.Metadata.IsEvergreenSafehouse,
            ),
            GroupData: groupData,
            Entrances:
                contractData.Metadata.Type === "sniper"
                    ? null
                    : unlockedEntrances
                          .filter((unlockable) =>
                              entrancesInScene.includes(
                                  unlockable.Properties.RepositoryId,
                              ),
                          )
                          .filter(
                              (unlockable) =>
                                  unlockable.Properties.Difficulty ===
                                  contractData.Metadata.Difficulty,
                          )
                          .sort(unlockOrderComparer),
            Location: sublocation,
            LoadoutData:
                contractData.Metadata.Type === "sniper" ? null : loadoutSlots,
            LimitedLoadoutUnlockLevel:
                limitedLoadoutUnlockLevelMap[sublocation.Id] ?? 0,
            CharacterLoadoutData:
                sniperLoadouts.length !== 0 ? sniperLoadouts : null,
            ChallengeData: {
                Children:
                    controller.challengeService.getChallengeTreeForContract(
                        req.query.contractid,
                        req.gameVersion,
                        req.jwt.unique_name,
                    ),
            },
            Currency: {
                Balance: 0,
            },
            PaymentDetails: {
                Currency: "Merces",
                Amount: 0,
                MaximumDeduction: 85,
                Bonuses: null,
                Expenses: null,
                Entrance: null,
                Pickup: null,
                SideMission: null,
            },
            OpportunityData: (contractData.Metadata.Opportunities || [])
                .map((value) => missionStories[value])
                .filter(Boolean),
            PlayerProfileXpData: {
                XP: userData.Extensions.progression.PlayerProfileXP.Total,
                Level: userData.Extensions.progression.PlayerProfileXP
                    .ProfileLevel,
                MaxLevel: getMaxProfileLevel(req.gameVersion),
            },
        },
    })
}
