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

import { getConfig, getVersionedConfig } from "../configSwizzleManager"
import type {
    CompletionData,
    GameChanger,
    GameVersion,
    GroupObjectiveDisplayOrderItem,
    MissionManifest,
    MissionManifestObjective,
    PeacockLocationsData,
    Unlockable,
    UserCentricContract,
} from "../types/types"
import { fastClone, nilUuid } from "../utils"
import { log, LogLevel } from "../loggingInterop"
import { getUserData } from "../databaseHandler"
import { controller } from "../controller"
import {
    escalationTypes,
    getLevelCount,
    getUserEscalationProgress,
} from "./escalations/escalationService"
import { translateEntitlements } from "../ownership"

// TODO: In the near future, this file should be cleaned up where possible.

/**
 * Get the sub-location from a contract's location field.
 *
 * @param contractData The contract data.
 * @param gameVersion The game version.
 * @returns The sub-location.
 */
export function getSubLocationFromContract(
    contractData: MissionManifest,
    gameVersion: GameVersion,
): Unlockable | undefined {
    if (
        gameVersion === "h1" &&
        contractData.Metadata.Location.includes("LOCATION_ICA_FACILITY")
    ) {
        contractData.Metadata.Location = "LOCATION_ICA_FACILITY"
    }

    return getSubLocationByName(contractData.Metadata.Location, gameVersion)
}

/**
 * Get a sub-location by name.
 *
 * @param name The sublocation's name (e.g. `LOCATION_NORTHAMERICA_GARTERSNAKE`).
 * @param gameVersion The game's version.
 * @returns The sub-location.
 */
export function getSubLocationByName(
    name: string,
    gameVersion: GameVersion,
): Unlockable | undefined {
    const locationsData = getVersionedConfig<PeacockLocationsData>(
        "LocationsData",
        gameVersion,
        false,
    )

    return fastClone(locationsData.children[name])
}

/**
 * Get a parent location by name.
 *
 * @param name The parent location's name (e.g. `LOCATION_PARENT_ICA_FACILITY`).
 * @param gameVersion The game's version.
 * @returns The parent location.
 */
export function getParentLocationByName(
    name: string,
    gameVersion: GameVersion,
): Unlockable | undefined {
    const locationsData = getVersionedConfig<PeacockLocationsData>(
        "LocationsData",
        gameVersion,
        false,
    )

    return fastClone(locationsData.parents[name])
}

/**
 * Generates a CompletionData object.
 *
 * @param subLocationId The ID of the targeted sub-location.
 * @param userId The ID of the user.
 * @param gameVersion The game's version.
 * @param contractType The type of the contract, only used to distinguish evergreen from other types (default).
 * @param subPackageId The sub package id you want (think of mastery).
 * @returns The completion data object.
 */
export function generateCompletionData(
    subLocationId: string,
    userId: string,
    gameVersion: GameVersion,
    contractType = "mission",
    subPackageId?: string,
): CompletionData {
    const subLocation = getSubLocationByName(subLocationId, gameVersion)
    let difficulty = undefined

    if (gameVersion === "h1") {
        difficulty = getUserData(userId, gameVersion).Extensions
            .gamepersistentdata.menudata.difficulty.destinations[
            subLocation ? subLocation.Properties?.ParentLocation : subLocationId
        ]
    }

    const locationId = subLocation
        ? subLocation.Properties?.ParentLocation
        : subLocationId

    const completionData = controller.masteryService.getLocationCompletion(
        locationId,
        subLocation?.Id,
        gameVersion,
        userId,
        contractType,
        subPackageId ? subPackageId : difficulty,
    )

    if (!completionData) {
        // Should only reach here for sniper locations with no subpackage id
        // specified or the ICA Facility in H2016.
        return {
            Level: 1,
            MaxLevel: 1,
            XP: 0,
            PreviouslySeenXp: 0,
            Completion: 1.0,
            XpLeft: 0,
            Id: locationId,
            SubLocationId: subLocation?.Id,
            HideProgression: true,
            IsLocationProgression: true,
            Name: null,
        }
    }

    return completionData
}

/**
 * Changes a contract to the "UserCentric" format.
 *
 * @param contractData Data about the contract.
 * @param userId The target user's ID.
 * @param gameVersion The game version.
 * @returns The user-centric contract.
 */
export function generateUserCentric(
    contractData: MissionManifest | undefined,
    userId: string,
    gameVersion: GameVersion,
): UserCentricContract | undefined {
    if (!contractData) {
        return undefined
    }

    const userData = getUserData(userId, gameVersion)
    const subLocation = getSubLocationFromContract(contractData, gameVersion)

    if (!subLocation) {
        log(
            LogLevel.DEBUG,
            `Missing ${contractData.Metadata.Location} in ${gameVersion} config!`,
        )
        return undefined
    }

    subLocation.DisplayNameLocKey = `UI_${subLocation!.Id}_NAME`

    if (gameVersion === "h1" || gameVersion === "h2") {
        // fix h1/h2 entitlements
        contractData.Metadata.Entitlements = translateEntitlements(
            gameVersion,
            contractData.Metadata.Entitlements,
        )
    }

    const played = userData.Extensions?.PeacockPlayedContracts
    const id = contractData.Metadata.Id

    const completionData = generateCompletionData(
        contractData.Metadata.Location,
        userId,
        gameVersion,
    )

    const uc: UserCentricContract = {
        Contract: contractData,
        Data: {
            IsLocked: subLocation?.Properties?.IsLocked || false,
            LockedReason: "",
            LocationLevel: completionData.Level,
            LocationMaxLevel: completionData.MaxLevel,
            LocationCompletion: completionData.Completion,
            LocationXpLeft: completionData.XpLeft,
            LocationHideProgression: completionData.HideProgression,
            ElusiveContractState: "",
            IsFeatured: false,
            LastPlayedAt:
                played[id] === undefined
                    ? undefined
                    : new Date(played[id]?.LastPlayedAt).toISOString(),
            // relevant for contracts
            // Favorite contracts
            PlaylistData: {
                IsAdded:
                    userData.Extensions?.PeacockFavoriteContracts?.includes(id),
                AddedTime: "0001-01-01T00:00:00Z",
            },
            Completed: played[id] === undefined ? false : played[id]?.Completed,
            LocationId: subLocation.Id,
            ParentLocationId: subLocation.Properties.ParentLocation!,
            CompletionData: completionData,
            DlcName: subLocation.Properties.DlcName!,
            DlcImage: subLocation.Properties.DlcImage!,
        },
    }

    if (escalationTypes.includes(contractData.Metadata.Type)) {
        const eGroupId =
            contractData.Metadata.InGroup ?? contractData.Metadata.Id

        const p = getUserEscalationProgress(userData, eGroupId)

        log(
            LogLevel.DEBUG,
            `Get EscalationUCProps - group: ${eGroupId} prog: ${p}`,
        )

        // Probably not needed, just in case though.
        delete uc.Data.Completed

        uc.Data.EscalationCompletedLevels = p - 1
        uc.Data.EscalationTotalLevels = getLevelCount(
            controller.resolveContract(eGroupId),
        )
        uc.Data.EscalationCompleted =
            userData.Extensions.PeacockCompletedEscalations.includes(eGroupId)
        if (contractData.Metadata.InGroup) uc.Data.InGroup = eGroupId
    }

    return uc
}

/**
 * Converts a series of objectives into the format that the planning screen expects.
 *
 * @param objectives The objectives.
 * @param gameChangers The game changers.
 * @param displayOrder The order in which to display the objectives.
 * @param isEvergreenSafehouse Is the contract the Safehouse?
 * @returns The converted objectives.
 */
export function mapObjectives(
    objectives: MissionManifestObjective[],
    gameChangers: string[],
    displayOrder: GroupObjectiveDisplayOrderItem[],
    isEvergreenSafehouse = false,
): MissionManifestObjective[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = new Map<string, any>()
    const gameChangerObjectives: MissionManifestObjective[] = []

    if (gameChangers && gameChangers.length > 0) {
        const gameChangerData: Record<string, GameChanger> = {
            ...getConfig<Record<string, GameChanger>>(
                "GameChangerProperties",
                true,
            ),
            ...getConfig<Record<string, GameChanger>>(
                "PeacockGameChangerProperties",
                true,
            ),
        }

        for (const gamechangerId of gameChangers) {
            if (isEvergreenSafehouse) break
            const gameChangerProps = gameChangerData[gamechangerId]

            if (gameChangerProps) {
                if (gameChangerProps.IsHidden) {
                    if (gameChangerProps.Objectives?.length === 1) {
                        // Either 0 or 1 I think.
                        const objective = gameChangerProps.Objectives[0]!
                        objective.Id = gamechangerId
                        gameChangerObjectives.push(objective)
                    }
                } else {
                    if (!gameChangerProps.ObjectivesCategory) {
                        gameChangerProps.ObjectivesCategory = (() => {
                            let obj: MissionManifestObjective

                            for (obj of gameChangerProps.Objectives) {
                                if (obj.Category === "primary") return "primary"
                                if (obj.Category === "secondary")
                                    return "secondary"
                            }

                            // If we've not hit a primary or secondary objective, we've hit a condition
                            // I'm not exactly sure if below follows what official does - AF
                            // EDIT: Turns out, conditions still show as optional, setting this to
                            //       primary for now, awaiting future investigation - AF
                            return "primary"
                        })()
                    }

                    result.set(gamechangerId, {
                        Type: "gamechanger",
                        Properties: {
                            Id: gamechangerId,
                            Name: gameChangerProps.Name,
                            Description: gameChangerProps.Description,
                            LongDescription:
                                gameChangerProps.LongDescription === undefined
                                    ? gameChangerProps.Description
                                    : gameChangerProps.LongDescription,
                            TileImage: gameChangerProps.TileImage,
                            Icon: gameChangerProps.Icon || "",
                            ObjectivesCategory:
                                gameChangerProps.ObjectivesCategory,
                        },
                    })
                }
            }
        }
    }

    for (const objective of (objectives || []).concat(gameChangerObjectives)) {
        if (!objective.Category) {
            objective.Category = objective.Primary ? "primary" : "secondary"
        }

        if (
            objective.Activation ||
            (objective.OnActive?.IfInProgress &&
                objective.OnActive.IfInProgress.Visible === false) ||
            (objective.OnActive?.IfCompleted &&
                objective.OnActive.IfCompleted.Visible === false &&
                objective.Definition &&
                objective.Definition.States &&
                objective.Definition.States.Start &&
                objective.Definition.States.Start["-"] &&
                objective.Definition.States.Start["-"].Transition === "Success")
        ) {
            continue // do not show objectives with 'ForceShowOnLoadingScreen: false' or objectives that are not visible on start
        }

        if (
            objective.SuccessEvent &&
            objective.SuccessEvent.EventName === "Kill" &&
            objective.SuccessEvent.EventValues &&
            objective.SuccessEvent.EventValues.RepositoryId
        ) {
            result.set(objective.Id, {
                Type: "kill",
                Properties: {
                    Id: objective.SuccessEvent.EventValues.RepositoryId,
                    Conditions: [],
                },
            })
        } else if (
            objective.HUDTemplate &&
            ["custom", "customkill", "setpiece"].includes(
                objective.ObjectiveType || "",
            )
        ) {
            let id: string | null | undefined = null

            if (
                objective.Definition?.Context?.Targets &&
                (objective.Definition.Context.Targets as string[]).length === 1
            ) {
                id = objective.Definition.Context.Targets[0]
            }

            const properties = {
                Id: id,
                BriefingText: objective.BriefingText || "",
                LongBriefingText:
                    objective.LongBriefingText === undefined
                        ? objective.BriefingText || ""
                        : objective.LongBriefingText,
                Image: objective.Image,
                BriefingName: objective.BriefingName,
                DisplayAsKill: objective.DisplayAsKillObjective || false,
                ObjectivesCategory: objective.Category as
                    | typeof objective.Category
                    | undefined,
                ForceShowOnLoadingScreen: (objective.ForceShowOnLoadingScreen ||
                    false) as boolean | undefined,
            }

            // noinspection GrazieInspection
            switch (objective.ObjectiveType) {
                case "customkill":
                    properties.Image = undefined
                    properties.ForceShowOnLoadingScreen = undefined
                    properties.BriefingName = undefined
                    break
                case "setpiece":
                    properties.ObjectivesCategory = undefined
                    break
                default: // only add Id for customkill and setpiece
                    properties.Id = undefined
                    break
            }

            result.set(objective.Id, {
                Type: objective.ObjectiveType,
                Properties: properties,
            })
        } else if (
            objective.Type === "statemachine" &&
            objective.Definition &&
            objective.Definition.Context &&
            objective.Definition.Context.Targets &&
            (objective.Definition.Context.Targets as unknown[]).length === 1 &&
            objective.HUDTemplate
        ) {
            // This objective will be displayed as a kill objective
            const Conditions = objective.TargetConditions
                ? objective.TargetConditions.map((condition) => ({
                      Type: condition.Type,
                      RepositoryId: condition.RepositoryId || nilUuid,
                      HardCondition: condition.HardCondition || false,
                      ObjectiveId: condition.ObjectiveId || nilUuid,
                      KillMethod: condition.KillMethod || "",
                  }))
                : []

            result.set(objective.Id, {
                Type: "kill",
                Properties: {
                    Id: objective.Definition.Context.Targets[0],
                    Conditions: Conditions,
                },
            })
        }
        // objective not shown on planning screen
    }

    const sortedResult: MissionManifestObjective[] = []
    const resultIds: Set<string> = new Set()

    for (const { Id, IsNew } of displayOrder || []) {
        if (!resultIds.has(Id)) {
            // if not yet added
            const objective = result.get(Id)

            if (objective) {
                if (IsNew) {
                    objective.Properties.IsNew = true
                }

                sortedResult.push(objective)
                resultIds.add(Id)
            }
        }
    }

    // This is something to get the main objective to show on the planning menu - AF
    if (isEvergreenSafehouse) {
        sortedResult.push(result.get("f9cfcf80-9977-4ad1-b3c7-0228a2026b9c"))
        resultIds.add("f9cfcf80-9977-4ad1-b3c7-0228a2026b9c")
    }

    // add each objective or gamechanger that is not already in the result
    for (const { Id, ExcludeFromScoring, ForceShowOnLoadingScreen } of (
        objectives || []
    ).concat((gameChangers || []).map((x) => ({ Id: x })))) {
        if (!resultIds.has(Id)) {
            const resultobjective = result.get(Id)

            if (
                resultobjective &&
                (!ExcludeFromScoring || ForceShowOnLoadingScreen)
            ) {
                sortedResult.push(resultobjective)
                resultIds.add(Id)
            }
        }
    }

    return sortedResult
}

const noDisguiseChanges = {
    IsCompleted: true,
    ContractConditionType: "PrimarySecondary",
    Primary: [
        {
            Type: "gamechanger",
            Properties: {
                Id: "63055f1a-bcd2-4e0f-8caf-b446f01d02f3",
                Name: "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_NO_DISGUISE_CHANGES_PRIMARY_NAME",
                Description:
                    "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_NO_DISGUISE_CHANGES_PRIMARY_DESC",
                LongDescription:
                    "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_NO_DISGUISE_CHANGES_PRIMARY_DESC",
                TileImage:
                    "images/contractconditions/condition_contract_no_disguise_changes.jpg",
                Icon: "images/challenges/default_challenge_icon.png",
                ObjectivesCategory: "primary",
            },
        },
    ],
    Secondary: [
        {
            Type: "gamechanger",
            Properties: {
                Id: "008d2eb9-c1c8-44e0-a636-ccca63629f3c",
                Name: "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_NO_DISGUISE_CHANGES_SECONDARY_NAME",
                Description:
                    "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_NO_DISGUISE_CHANGES_SECONDARY_DESC",
                LongDescription:
                    "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_NO_DISGUISE_CHANGES_SECONDARY_DESC",
                TileImage:
                    "images/contractconditions/condition_contract_no_disguise_changes.jpg",
                Icon: "images/challenges/default_challenge_icon.png",
                ObjectivesCategory: "secondary",
            },
        },
    ],
}

const targetsOnly = {
    IsCompleted: true,
    ContractConditionType: "PrimarySecondary",
    Primary: [
        {
            Type: "gamechanger",
            Properties: {
                Id: "f41f18fe-0fe5-416a-a793-50727e594655",
                Name: "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_TARGETS_ONLY_PRIMARY_NAME",
                Description:
                    "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_TARGETS_ONLY_PRIMARY_DESC",
                LongDescription:
                    "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_TARGETS_ONLY_PRIMARY_DESC",
                TileImage:
                    "images/contractconditions/condition_contrac_targets_only.jpg",
                Icon: "images/challenges/default_challenge_icon.png",
                ObjectivesCategory: "primary",
            },
        },
    ],
    Secondary: [
        {
            Type: "gamechanger",
            Properties: {
                Id: "8618ebaa-f42b-42ce-be20-00d2b0a04897",
                Name: "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_TARGETS_ONLY_SECONDARY_NAME",
                Description:
                    "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_TARGETS_ONLY_SECONDARY_DESC",
                LongDescription:
                    "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_TARGETS_ONLY_SECONDARY_DESC",
                TileImage:
                    "images/contractconditions/condition_contrac_targets_only.jpg",
                Icon: "images/challenges/default_challenge_icon.png",
                ObjectivesCategory: "secondary",
            },
        },
    ],
}

const noRecordings = {
    IsCompleted: true,
    ContractConditionType: "PrimarySecondary",
    Primary: [
        {
            Type: "gamechanger",
            Properties: {
                Id: "1f1f3c9e-1490-4fcc-aee6-5fde7c6c48ca",
                Name: "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_NO_RECORDINGS_PRIMARY_NAME",
                Description:
                    "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_NO_RECORDINGS_PRIMARY_DESC",
                LongDescription:
                    "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_NO_RECORDINGS_PRIMARY_DESC",
                TileImage:
                    "images/contracts/gamechangers/gamechanger_global_bigbrother.jpg",
                Icon: "images/challenges/default_challenge_icon.png",
                ObjectivesCategory: "primary",
            },
        },
    ],
    Secondary: [
        {
            Type: "gamechanger",
            Properties: {
                Id: "1f8f0b8b-1f65-4d6c-a2f4-fc8adffa394a",
                Name: "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_NO_RECORDINGS_SECONDARY_NAME",
                Description:
                    "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_NO_RECORDINGS_SECONDARY_DESC",
                LongDescription:
                    "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_NO_RECORDINGS_SECONDARY_DESC",
                TileImage:
                    "images/contracts/gamechangers/gamechanger_global_bigbrother.jpg",
                Icon: "images/challenges/default_challenge_icon.png",
                ObjectivesCategory: "secondary",
            },
        },
    ],
}

const headshotsOnly = {
    IsCompleted: true,
    ContractConditionType: "PrimarySecondary",
    Primary: [
        {
            Type: "gamechanger",
            Properties: {
                Id: "3fea3aea-0233-46bb-8bc1-08757a2f6a74",
                Name: "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_HEADSHOTS_ONLY_PRIMARY_NAME",
                Description:
                    "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_HEADSHOTS_ONLY_PRIMARY_DESC",
                LongDescription:
                    "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_HEADSHOTS_ONLY_PRIMARY_DESC",
                TileImage:
                    "images/contractconditions/condition_contrac_headshots_only.jpg",
                Icon: "images/challenges/default_challenge_icon.png",
                ObjectivesCategory: "primary",
            },
        },
    ],
    Secondary: [
        {
            Type: "gamechanger",
            Properties: {
                Id: "1efef5c0-7381-4e22-ac04-ffbd0822cc96",
                Name: "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_HEADSHOTS_ONLY_SECONDARY_NAME",
                Description:
                    "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_HEADSHOTS_ONLY_SECONDARY_DESC",
                LongDescription:
                    "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_HEADSHOTS_ONLY_SECONDARY_DESC",
                TileImage:
                    "images/contractconditions/condition_contrac_headshots_only.jpg",
                Icon: "images/challenges/default_challenge_icon.png",
                ObjectivesCategory: "secondary",
            },
        },
    ],
}

const noMissedShots = {
    IsCompleted: true,
    ContractConditionType: "PrimarySecondary",
    Primary: [
        {
            Type: "gamechanger",
            Properties: {
                Id: "25760ea6-958b-4aab-97d4-b539c5b025c8",
                Name: "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_NO_MISSED_SHOTS_PRIMARY_NAME",
                Description:
                    "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_NO_MISSED_SHOTS_PRIMARY_DESC",
                LongDescription:
                    "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_NO_MISSED_SHOTS_PRIMARY_DESC",
                TileImage:
                    "images/contractconditions/condition_contrac_no_missed_shots.jpg",
                Icon: "images/challenges/default_challenge_icon.png",
                ObjectivesCategory: "primary",
            },
        },
    ],
    Secondary: [
        {
            Type: "gamechanger",
            Properties: {
                Id: "f96e94b7-1c0e-49c9-9332-07346a955fd2",
                Name: "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_NO_MISSED_SHOTS_SECONDARY_NAME",
                Description:
                    "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_NO_MISSED_SHOTS_SECONDARY_DESC",
                LongDescription:
                    "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_NO_MISSED_SHOTS_SECONDARY_DESC",
                TileImage:
                    "images/contractconditions/condition_contrac_no_missed_shots.jpg",
                Icon: "images/challenges/default_challenge_icon.png",
                ObjectivesCategory: "secondary",
            },
        },
    ],
}

const noPacifications = {
    IsCompleted: true,
    ContractConditionType: "PrimarySecondary",
    Primary: [
        {
            Type: "gamechanger",
            Properties: {
                Id: "ce154566-a4ba-43c5-be4e-79240ce0f3f9",
                Name: "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_NO_PACIFICATIONS_PRIMARY_NAME",
                Description:
                    "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_NO_PACIFICATIONS_PRIMARY_DESC",
                LongDescription:
                    "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_NO_PACIFICATIONS_PRIMARY_DESC",
                TileImage:
                    "images/contracts/gamechangers/Gamechanger_Global_NoPacifications.jpg",
                Icon: "images/challenges/default_challenge_icon.png",
                ObjectivesCategory: "primary",
            },
        },
    ],
    Secondary: [
        {
            Type: "gamechanger",
            Properties: {
                Id: "95690829-7da4-4225-a087-08918cccf120",
                Name: "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_NO_PACIFICATIONS_SECONDARY_NAME",
                Description:
                    "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_NO_PACIFICATIONS_SECONDARY_DESC",
                LongDescription:
                    "UI_GAMECHANGERS_GLOBAL_CONTRACTCONDITION_NO_PACIFICATIONS_SECONDARY_DESC",
                TileImage:
                    "images/contracts/gamechangers/Gamechanger_Global_NoPacifications.jpg",
                Icon: "images/challenges/default_challenge_icon.png",
                ObjectivesCategory: "secondary",
            },
        },
    ],
}

export function complications(timeString: string) {
    return [
        {
            IsCompleted: true,
            ContractConditionType: "PrimarySecondary",
            Primary: [
                {
                    Type: "custom",
                    Properties: {
                        Id: "3d6f9119-7ec8-496f-ab4c-ed9757d976a4",
                        BriefingName: "$loc UI_CONTRACT_UGC_TIME_LIMIT_NAME",
                        BriefingText: {
                            $loc: {
                                key: "UI_CONTRACT_UGC_TIME_LIMIT_PRIMARY_DESC",
                                data: `$formatstring ${timeString}`,
                            },
                        },
                        LongBriefingText: {
                            $loc: {
                                key: "UI_CONTRACT_UGC_TIME_LIMIT_PRIMARY_DESC",
                                data: `$formatstring ${timeString}`,
                            },
                        },
                        Image: "images/contractconditions/condition_contrac_time_limit.jpg",
                        ObjectivesCategory: "primary",
                    },
                },
            ],
            Secondary: [
                {
                    Type: "custom",
                    Properties: {
                        Id: "1a596216-381e-4592-9798-26f156973942",
                        BriefingName: "$loc UI_CONTRACT_UGC_TIME_LIMIT_NAME",
                        BriefingText: {
                            $loc: {
                                key: "UI_CONTRACT_UGC_TIME_LIMIT_SECONDARY_DESC",
                                data: `$formatstring ${timeString}`,
                            },
                        },
                        LongBriefingText: {
                            $loc: {
                                key: "UI_CONTRACT_UGC_TIME_LIMIT_SECONDARY_DESC",
                                data: `$formatstring ${timeString}`,
                            },
                        },
                        Image: "images/contractconditions/condition_contrac_time_limit.jpg",
                        ObjectivesCategory: "secondary",
                    },
                },
            ],
        },
        {
            IsCompleted: true,
            ContractConditionType: "Single",
            ObjectiveInfo: [
                {
                    Type: "custom",
                    Properties: {
                        Id: "05080d1d-e3c4-4960-a087-661d141363eb",
                        BriefingName: "$loc UI_CONTRACT_UGC_REQUIRED_EXIT_NAME",
                        BriefingText: "$loc UI_CONTRACT_UGC_REQUIRED_EXIT_DESC",
                        LongBriefingText:
                            "$loc UI_CONTRACT_UGC_REQUIRED_EXIT_DESC",
                        Image: "images/contractconditions/condition_contrac_required_exit.jpg",
                        ObjectivesCategory: "primary",
                    },
                },
            ],
        },
        noDisguiseChanges,
        noPacifications,
        noRecordings,
        noMissedShots,
        headshotsOnly,
        targetsOnly,
    ]
}

/*
const PISTOL_ELIM = {
    $any: {
        "?": {
            $or: [
                {
                    $eq: ["$.#", "pistol"],
                },
                {
                    $eq: ["$.#", "close_combat_pistol_elimination"],
                },
            ],
        },
        in: ["$Value.KillMethodBroad", "$Value.KillMethodStrict"],
    },
}

export class StateMachineGenerationContext {
    public createKillMethodStateMachine(): void {
        this.weaponTargetStateMachine = {
            _comment: `Eliminate ${this.targetId} using weapon`,
            Type: "statemachine",
            Id: this.weaponTargetStateMachineId,
            Category: "secondary",
            Definition: {
                Scope: "Hit",
                Context: {
                    Targets: [this.targetId],
                },
                States: {
                    Start: {
                        Kill: [
                            {
                                Condition: {
                                    $and: [
                                        {
                                            $eq: [
                                                "$Value.RepositoryId",
                                                this.targetId,
                                            ],
                                        },
                                        {
                                            $eq: [
                                                "$Value.KillMethodStrict",
                                                this.genContextParams
                                                    .KillMethodStrict,
                                            ],
                                        },
                                    ],
                                },
                                Transition: "Success",
                            },
                            {
                                Condition: {
                                    $eq: ["$Value.RepositoryId", this.targetId],
                                },
                                Transition: "Failure",
                            },
                        ],
                    },
                },
            },
        }
    }

    private kmConditions(killMethodBroad) {
        switch (killMethodBroad) {
            case "pistol":
                return PISTOL_ELIM
            default:
                // weapon
                return {
                    $eq: [
                        "$Value.KillMethodStrict",
                        this.genContextParams.KillMethodStrict,
                    ],
                }
        }
    }
}
 */
