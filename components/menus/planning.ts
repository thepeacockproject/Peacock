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

import type { RequestWithJwt, SceneConfig } from "../types/types"
import { log, LogLevel } from "../loggingInterop"
import { _legacyBull, _theLastYardbirdScpc, controller } from "../controller"
import {
    contractIdToEscalationGroupId,
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
import { nilUuid, unlockorderComparer } from "../utils"

import type { Response } from "express"
import { createInventory } from "../inventory"
import { createSniperLoadouts } from "./sniper"
import { getFlag } from "../flags"
import { loadouts } from "../loadouts"
import { resolveProfiles } from "../profileHandler"
import { PlanningQuery } from "../types/gameSchemas"

export async function planningView(
    req: RequestWithJwt<PlanningQuery>,
    res: Response,
): Promise<void> {
    if (!req.query.contractid || !req.query.resetescalation) {
        res.status(400).send("invalid query")
        return
    }

    const entranceData = getConfig<SceneConfig>("Entrances", false)
    const missionStories = getConfig<Record<string, unknown>>(
        "MissionStories",
        false,
    )

    const userData = getUserData(req.jwt.unique_name, req.gameVersion)

    const isForReset = req.query.resetescalation === "true"

    if (isForReset) {
        const escalationGroupId = contractIdToEscalationGroupId(
            req.query.contractid,
        )

        resetUserEscalationProgress(userData, escalationGroupId)

        writeUserData(req.jwt.unique_name, req.gameVersion)

        // now reassign properties and continue
        req.query.contractid =
            controller.escalationMappings[escalationGroupId]["1"]
    }

    const contractData =
        req.gameVersion === "h1" &&
        req.query.contractid === "42bac555-bbb9-429d-a8ce-f1ffdf94211c"
            ? _legacyBull
            : req.query.contractid === "ff9f46cf-00bd-4c12-b887-eac491c3a96d"
            ? _theLastYardbirdScpc
            : controller.resolveContract(req.query.contractid)

    if (!contractData) {
        log(LogLevel.ERROR, `Not found: ${req.query.contractid}.`)
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

    const escalationGroupId = contractIdToEscalationGroupId(
        req.query.contractid,
    )

    if (escalationGroupId) {
        const p = getUserEscalationProgress(userData, escalationGroupId)
        const done =
            userData.Extensions.PeacockCompletedEscalations.includes(
                escalationGroupId,
            )

        groupData.GroupId = escalationGroupId
        groupData.GroupTitle = contractData.Metadata.Title
        groupData.CompletedLevels = done ? p : p - 1
        groupData.Completed = done
        groupData.TotalLevels = getLevelCount(
            controller.escalationMappings[escalationGroupId],
        )
        groupData.BestScore = 0
        groupData.BestPlayer = nilUuid
        groupData.BestLevel = 0
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
        userData.Extensions.entP,
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
    let suit = "TOKEN_OUTFIT_HITMANSUIT"
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

    const escalation = contractData.Metadata.Type === "escalation"

    const userCentric = generateUserCentric(
        contractData,
        req.jwt.unique_name,
        req.gameVersion,
    )

    if (userCentric.Contract.Metadata.Type === "elusive") {
        // change the type until we figure out why they become unplayable
        userCentric.Contract.Metadata.Type = "mission"
    }

    const sniperLoadouts = createSniperLoadouts(contractData)

    if (req.gameVersion === "scpc") {
        sniperLoadouts.forEach((loadout) => {
            loadout["LoadoutData"] = loadout["Loadout"]["LoadoutData"]
            delete loadout["Loadout"]
        })
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
            ElusiveContractState: "",
            UserCentric: userCentric,
            IsFirstInGroup: escalation
                ? controller.escalationMappings[escalationGroupId]["1"] ===
                  req.query.contractid
                : true,
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
                          .sort(unlockorderComparer),
            Location: sublocation,
            LoadoutData:
                contractData.Metadata.Type === "sniper"
                    ? null
                    : [
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
                                      contractData.Peacock?.noCarriedWeapon ===
                                      true
                                          ? null
                                          : typedInv.find(
                                                (item) =>
                                                    item.Unlockable.Id ===
                                                    pistol,
                                            ),
                                  type: "concealedweapon",
                              },
                          },
                          {
                              SlotName: "disguise",
                              SlotId: "3",
                              Recommended: {
                                  item: typedInv.find(
                                      (item) => item.Unlockable.Id === suit,
                                  ),
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
                                          : typedInv.find(
                                                (item) =>
                                                    item.Unlockable.Id ===
                                                    tool1,
                                            ),
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
                                          : typedInv.find(
                                                (item) =>
                                                    item.Unlockable.Id ===
                                                    tool2,
                                            ),
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
                      ].filter(Boolean),
            LimitedLoadoutUnlockLevel: 0, // Hokkaido
            CharacterLoadoutData:
                sniperLoadouts.length !== 0 ? sniperLoadouts : null,
            ChallengeData: {
                Children:
                    controller.challengeService.getChallengePlanningDataForContract(
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
                MaxLevel: 5000,
            },
        },
    })
}
