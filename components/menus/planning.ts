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

import type {
    CompiledChallengeTreeCategory,
    GameVersion,
    MissionManifest,
    MissionStory,
    ProgressionData,
    SceneConfig,
    Unlockable,
    UserCentricContract,
    UserProfile,
} from "../types/types"
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

import { createInventory, getUnlockableById } from "../inventory"
import { createSniperLoadouts, SniperCharacter, SniperLoadout } from "./sniper"
import { getFlag } from "../flags"
import { loadouts } from "../loadouts"
import { resolveProfiles } from "../profileHandler"
import { userAuths } from "../officialServerAuth"
import assert from "assert"

export type PlanningError = { error: boolean }

export type PlanningGroupData = {
    GroupId: string | undefined
    GroupTitle: string | undefined
    CompletedLevels: number | undefined
    Completed: boolean | undefined
    TotalLevels: number | undefined
    BestScore: number | undefined
    BestPlayer: string | undefined
    BestLevel: number | undefined
}

export type GamePlanningData = {
    Contract: MissionManifest
    ElusiveContractState?: "not_completed" | string
    UserCentric?: UserCentricContract
    IsFirstInGroup: boolean
    Creator: UserProfile
    UserContract?: boolean
    UnlockedEntrances?: string[] | null
    UnlockedAgencyPickups?: string[] | null
    Objectives?: unknown
    GroupData?: PlanningGroupData
    Entrances: Unlockable[] | null
    Location: Unlockable
    LoadoutData: unknown
    LimitedLoadoutUnlockLevel: number
    CharacterLoadoutData?: unknown | null
    ChallengeData?: {
        Children: CompiledChallengeTreeCategory[]
    }
    Currency?: {
        Balance: number
    }
    PaymentDetails?: {
        Currency: "Merces" | string
        Amount: number | null
        MaximumDeduction: number | null
        Bonuses: null
        Expenses: null
        Entrance: null
        Pickup: null
        SideMission: null
    }
    OpportunityData?: unknown[]
    PlayerProfileXpData?: {
        XP: number
        Level: number
        MaxLevel: number
    }
}

export async function getPlanningData(
    contractId: string,
    resetEscalation: boolean,
    userId: string,
    gameVersion: GameVersion,
): Promise<PlanningError | GamePlanningData> {
    const entranceData = getConfig<SceneConfig>("Entrances", false)
    const missionStories = getConfig<Record<string, MissionStory>>(
        "MissionStories",
        false,
    )

    const userData = getUserData(userId, gameVersion)

    for (const ms in userData.Extensions.opportunityprogression) {
        if (Object.keys(missionStories).includes(ms)) {
            missionStories[ms].PreviouslyCompleted = true
        }
    }

    let contractData: MissionManifest | undefined

    if (
        gameVersion === "h1" &&
        contractId === "42bac555-bbb9-429d-a8ce-f1ffdf94211c"
    ) {
        contractData = _legacyBull
    } else if (contractId === "ff9f46cf-00bd-4c12-b887-eac491c3a96d") {
        contractData = _theLastYardbirdScpc
    } else {
        contractData = controller.resolveContract(contractId)
    }

    if (!contractData) {
        return {
            error: true,
        }
    }

    if (resetEscalation) {
        const escalationGroupId =
            contractData.Metadata.InGroup ?? contractData.Metadata.Id

        controller.hooks.onEscalationReset.call(escalationGroupId)

        resetUserEscalationProgress(userData, escalationGroupId)

        writeUserData(userId, gameVersion)

        const group = controller.escalationMappings.get(escalationGroupId)

        if (!group) {
            log(
                LogLevel.ERROR,
                `Unknown escalation group: ${escalationGroupId}`,
            )
            return { error: true }
        }

        // now reassign properties and continue
        contractId = group["1"]

        contractData = controller.resolveContract(contractId)
    }

    if (!contractData) {
        // This will only happen for **contracts** that are meant to be fetched from the official servers.
        // E.g. trending contracts, most played last week, etc.
        // This will also fetch a contract if the player has downloaded it before but deleted the files.
        // E.g. the user adds a contract to favorites, then deletes the files, then tries to load the contract again.
        log(
            LogLevel.WARN,
            `Trying to download contract ${contractId} due to it not found locally.`,
        )
        const user = userAuths.get(userId)
        const resp = await user?._useService(
            `https://${getRemoteService(
                gameVersion,
            )}.hitman.io/profiles/page/Planning?contractid=${contractId}&resetescalation=false&forcecurrentcontract=false&errorhandling=false`,
            true,
        )

        contractData = resp?.data.data.Contract

        if (!contractData) {
            log(
                LogLevel.ERROR,
                `Official planning lookup no result: ${contractId}`,
            )
            return { error: true }
        }

        controller.fetchedContracts.set(contractData.Metadata.Id, contractData)
    }

    if (!contractData) {
        log(LogLevel.ERROR, `Not found: ${contractId}, planning regular.`)
        return { error: true }
    }

    const groupData: PlanningGroupData = {
        GroupId: undefined,
        GroupTitle: undefined,
        CompletedLevels: undefined,
        Completed: undefined,
        TotalLevels: undefined,
        BestScore: undefined,
        BestPlayer: undefined,
        BestLevel: undefined,
    }

    const escalation = escalationTypes.includes(contractData.Metadata.Type)

    // It is possible for req.query.contractid to be the id of a group OR a level in that group.
    const escalationGroupId =
        contractData.Metadata.InGroup ?? contractData.Metadata.Id

    if (escalation) {
        const groupContractData = controller.resolveContract(escalationGroupId)

        if (!groupContractData) {
            log(LogLevel.ERROR, `Not found: ${contractId}, planning esc group`)
            return { error: true }
        }

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
            const newLevelId =
                contractData.Metadata.GroupDefinition?.Order[p - 1]

            assert(typeof newLevelId === "string", "newLevelId is not a string")

            contractData = controller.resolveContract(newLevelId)
        }
    }

    if (!contractData) {
        log(LogLevel.WARN, `Unknown contract: ${contractId}`)
        return { error: true }
    }

    const creatorProfile = (
        await resolveProfiles(
            [
                contractData.Metadata.CreatorUserId || "",
                "fadb923c-e6bb-4283-a537-eb4d1150262e",
            ],
            gameVersion,
        )
    )[0]

    const scenePath = contractData.Metadata.ScenePath.toLowerCase()

    log(
        LogLevel.DEBUG,
        `Looking up details for contract - Location:${contractData.Metadata.Location} (${scenePath})`,
    )

    const sublocation = getSubLocationFromContract(contractData, gameVersion)

    assert.ok(sublocation, "contract sublocation is null")

    if (!entranceData[scenePath]) {
        log(
            LogLevel.ERROR,
            `Could not find Entrance data for ${scenePath} in planning`,
        )
        return {
            error: true,
        }
    }

    const entrancesInScene = entranceData[scenePath]

    const typedInv = createInventory(userId, gameVersion, sublocation)

    const unlockedEntrances = typedInv
        .filter((item) => item.Unlockable.Type === "access")
        .map((i) => i.Unlockable)
        .filter((unlockable) => unlockable.Properties.RepositoryId)

    if (!unlockedEntrances) {
        log(
            LogLevel.ERROR,
            "No matching entrance data found in planning, this is a bug!",
        )
        return {
            error: true,
        }
    }

    sublocation.DisplayNameLocKey = `UI_${sublocation.Id}_NAME`

    // Default loadout

    let currentLoadout = loadouts.getLoadoutFor(gameVersion)

    if (!currentLoadout) {
        currentLoadout = loadouts.createDefault(gameVersion)
    }

    let pistol = "FIREARMS_HERO_PISTOL_TACTICAL_ICA_19"
    let suit = getDefaultSuitFor(sublocation)
    let tool1 = "TOKEN_FIBERWIRE"
    let tool2 = "PROP_TOOL_COIN"
    let briefcaseContainedItemId: string | undefined = undefined
    let briefcaseId: string | undefined = undefined

    const dlForLocation =
        getFlag("loadoutSaving") === "LEGACY"
            ? // older default loadout setting (per-person)
              userData.Extensions.defaultloadout?.[
                  contractData.Metadata.Location
              ]
            : // new loadout profiles system
              currentLoadout.data[contractData.Metadata.Location]

    if (dlForLocation) {
        pistol = dlForLocation["2"]!
        suit = dlForLocation["3"]!
        tool1 = dlForLocation["4"]!
        tool2 = dlForLocation["5"]!

        for (const key of Object.keys(dlForLocation)) {
            if (["2", "3", "4", "5"].includes(key)) {
                // we're looking for keys that aren't taken up by other things
                continue
            }

            briefcaseId = key
            // @ts-expect-error This will work.
            briefcaseContainedItemId = dlForLocation[key]
        }
    }

    const briefcaseContainedItem = typedInv.find(
        (item) => item.Unlockable.Id === briefcaseContainedItemId,
    )

    const userCentric = generateUserCentric(contractData, userId, gameVersion)

    const sniperLoadouts = createSniperLoadouts(
        userId,
        gameVersion,
        contractData,
    )

    if (gameVersion === "scpc") {
        for (const loadout of sniperLoadouts) {
            const l = loadout as SniperLoadout
            l["LoadoutData"] = (loadout as SniperCharacter)["Loadout"][
                "LoadoutData"
            ]
            delete (loadout as Partial<SniperCharacter>)["Loadout"]
        }
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
        briefcaseId &&
            briefcaseContainedItem && {
                SlotName: briefcaseContainedItemId,
                SlotId: briefcaseId,
                Recommended: {
                    item: {
                        ...briefcaseContainedItem,
                        Properties: {},
                    },
                    type: briefcaseContainedItem.Unlockable.Id,
                    owned: true,
                },
                IsContainer: true,
            },
    ].filter(Boolean)

    /**
     * Handles loadout lock for Miami and Hokkaido
     * TODO: migrate this to use the actual game data.
     */
    const limitedLoadoutUnlockLevelMap = {
        LOCATION_MIAMI: 2,
        LOCATION_HOKKAIDO: 20,
        LOCATION_HOKKAIDO_MAMUSHI: 20,
    }

    if (
        sublocation?.Properties?.LimitedLoadout &&
        getFlag("enableMasteryProgression")
    ) {
        const loadoutUnlockable = getUnlockableById(
            gameVersion === "h1"
                ? // @ts-expect-error This works.
                  sublocation?.Properties?.NormalLoadoutUnlock[
                      contractData.Metadata.Difficulty ?? "normal"
                  ]
                : sublocation?.Properties?.NormalLoadoutUnlock,
            gameVersion,
        )

        if (loadoutUnlockable) {
            const loadoutMasteryData =
                controller.masteryService.getMasteryForUnlockable(
                    loadoutUnlockable,
                    gameVersion,
                )

            const locationProgression: ProgressionData =
                loadoutMasteryData?.SubPackageId
                    ? // @ts-expect-error This works
                      userData.Extensions.progression.Locations[
                          loadoutMasteryData.Location
                      ][loadoutMasteryData.SubPackageId]
                    : userData.Extensions.progression.Locations[
                          loadoutMasteryData?.Location as unknown as string
                      ]

            if (locationProgression.Level < (loadoutMasteryData?.Level || 0)) {
                type S = {
                    SlotId: string
                }
                loadoutSlots = loadoutSlots.filter(
                    (slot) => !["2", "4", "5"].includes((slot as S)?.SlotId),
                )
            }
        }
    }

    assert.ok(contractData, "no contract data at final - planning")

    type Cast = keyof typeof limitedLoadoutUnlockLevelMap

    return {
        Contract: contractData,
        ElusiveContractState: "not_completed",
        UserCentric: userCentric,
        IsFirstInGroup: escalation ? groupData.CompletedLevels === 0 : true,
        Creator: creatorProfile,
        UserContract: creatorProfile.DevId !== "IOI",
        UnlockedEntrances:
            contractData.Metadata.Type === "sniper"
                ? null
                : (typedInv
                      .filter(
                          (item) =>
                              item.Unlockable.Subtype === "startinglocation",
                      )
                      .filter(
                          (item) =>
                              item.Unlockable.Properties.Difficulty ===
                              contractData!.Metadata.Difficulty,
                      )
                      .map((i) => i.Unlockable.Properties.RepositoryId)
                      .filter(Boolean) as string[]),
        UnlockedAgencyPickups:
            contractData.Metadata.Type === "sniper"
                ? null
                : (typedInv
                      .filter((item) => item.Unlockable.Type === "agencypickup")
                      .filter(
                          (item) =>
                              item.Unlockable.Properties.Difficulty ===
                              // we already know it's not undefined
                              contractData!.Metadata.Difficulty,
                      )
                      .map((i) => i.Unlockable.Properties.RepositoryId)
                      .filter(Boolean) as string[]),
        Objectives: mapObjectives(
            contractData.Data.Objectives!,
            contractData.Data.GameChangers || [],
            contractData.Metadata.GroupObjectiveDisplayOrder || [],
            Boolean(contractData.Metadata.IsEvergreenSafehouse),
        ),
        GroupData: groupData,
        Entrances:
            contractData.Metadata.Type === "sniper"
                ? null
                : unlockedEntrances
                      .filter((unlockable) =>
                          entrancesInScene.includes(
                              unlockable.Properties.RepositoryId || "",
                          ),
                      )
                      .filter(
                          (unlockable) =>
                              unlockable.Properties.Difficulty ===
                              // we already know it's not undefined
                              contractData!.Metadata.Difficulty,
                      )
                      .sort(unlockOrderComparer),
        Location: sublocation,
        LoadoutData:
            contractData.Metadata.Type === "sniper" ? null : loadoutSlots,
        LimitedLoadoutUnlockLevel:
            limitedLoadoutUnlockLevelMap[sublocation.Id as Cast] ?? 0,
        CharacterLoadoutData:
            sniperLoadouts.length !== 0 ? sniperLoadouts : null,
        ChallengeData: {
            Children: controller.challengeService.getChallengeTreeForContract(
                contractId,
                gameVersion,
                userId,
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
            Level: userData.Extensions.progression.PlayerProfileXP.ProfileLevel,
            MaxLevel: getMaxProfileLevel(gameVersion),
        },
    }
}
