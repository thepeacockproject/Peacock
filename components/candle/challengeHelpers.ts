/*
 *     The Peacock Project - a HITMAN server replacement.
 *     Copyright (C) 2021-2026 The Peacock Project Team
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

import {
    ChallengeProgressionData,
    CompiledChallengeIngameData,
    CompiledChallengeRuntimeData,
    GameVersion,
    InclusionData,
    MissionManifest,
    MissionType,
    RegistryChallenge,
} from "../types/types"
import { SavedChallengeGroup } from "../types/challenges"
import { controller } from "../controller"
import { gameDifficulty, isSniperLocation } from "../utils"
import assert from "assert"

/**
 * Change a registry challenge to the runtime format (for GetActiveChallenges).
 * @param challenge The challenge.
 * @returns The runtime challenge.
 * @see {@link compileRuntimeChallenge} for the modern variant with progression data.
 */
export function compileRuntimeChallengeOnly(
    challenge: RegistryChallenge,
): CompiledChallengeIngameData {
    return {
        Id: challenge.Id,
        GroupId: challenge.inGroup,
        Name: challenge.Name,
        Type: challenge.RuntimeType || "contract",
        Description: challenge.Description,
        ImageName: challenge.ImageName,
        InclusionData: challenge.InclusionData || undefined,
        Definition: challenge.Definition,
        Tags: challenge.Tags,
        Drops: challenge.Drops,
        LastModified: "2021-01-06T23:00:32.0117635", // this is a lie 👍
        PlayableSince: null,
        PlayableUntil: null,
        Xp: challenge.Rewards.MasteryXP || 0,
        XpModifier: challenge.XpModifier || {},
    }
}

/**
 * Change a registry challenge to the runtime format (for GetActiveChallengesAndProgression).
 * @param challenge The challenge.
 * @param progression The progression data.
 * @returns The runtime challenge (including progression data).
 * @see {@link compileRuntimeChallengeOnly} for when you only need the challenge data.
 */
export function compileRuntimeChallenge(
    challenge: RegistryChallenge,
    progression: ChallengeProgressionData,
): CompiledChallengeRuntimeData {
    return {
        Challenge: compileRuntimeChallengeOnly(challenge),
        Progression: progression,
    }
}

/**
 * How to handle filtering of challenges.
 */
export enum ChallengeFilterType {
    /** Note that this option will include global elusive and escalations challenges. */
    None = "None",
    /** A single contract's challenges. */
    Contract = "Contract",
    /** Only used for the CAREER -> CHALLENGES page */
    Contracts = "Contracts",
    /** Only used for the location page, and when calculating location completion */
    ParentLocation = "ParentLocation",
    /** Challenges for a contract type. Only used for ContractTypeChallenges */
    ContractType = "ContractType",
}

/**
 * How to handle filtering of pro1 challenges.
 * Works in conjunction with {@link ChallengeFilterType}, but only if the
 * challenge is tagged as pro1 and the challenge filter is met.
 */
export enum Pro1FilterType {
    /**
     * Only include pro1 challenges.
     */
    Only = "Only",
    /**
     * Include both pro1 and non-pro1 challenges.
     */
    Ignore = "Ignore",
    /**
     * Exclude pro1 challenges.
     */
    Exclude = "Exclude",
}

export type ChallengeFilterOptions =
    | {
          type: ChallengeFilterType.None
      }
    | {
          type: ChallengeFilterType.Contract
          contractId: string
          locationId: string
          gameVersion: GameVersion
          isFeatured?: boolean
          difficulty: number
          pro1Filter: Pro1FilterType
      }
    | {
          type: ChallengeFilterType.Contracts
          contractIds: string[]
          gameVersion: GameVersion
          locationId: string
          pro1Filter: Pro1FilterType
      }
    | {
          type: ChallengeFilterType.ContractType
          contractType: MissionType
      }
    | {
          type: ChallengeFilterType.ParentLocation
          parent: string
          gameVersion: GameVersion
          pro1Filter: Pro1FilterType
      }

/**
 * Checks if the metadata of a contract matches the definition in the InclusionData of a challenge.
 * @param incData The inclusion data of the challenge in question. Will return true if this is null.
 * @param contract The contract in question.
 * @returns A boolean as the result.
 */
export function inclusionDataCheck(
    incData: InclusionData | undefined,
    contract: MissionManifest | undefined,
): boolean {
    if (!incData) return true
    if (!contract) return false

    const checks: boolean[] = []

    if (incData.ContractIds)
        checks.push(incData.ContractIds?.includes(contract.Metadata.Id))

    if (incData.ContractTypes)
        checks.push(incData.ContractTypes?.includes(contract.Metadata.Type))

    if (incData.Locations)
        checks.push(incData.Locations?.includes(contract.Metadata.Location))

    if (incData.GameModes)
        checks.push(
            contract.Metadata?.Gamemodes?.some((r) =>
                incData.GameModes?.includes(r),
            ) ?? false,
        )

    return checks.length === 0 ? false : checks.every(Boolean)
}

export function isChallengeForDifficulty(
    difficulty: number,
    challenge: RegistryChallenge,
): boolean {
    return (
        !challenge.DifficultyLevels ||
        challenge.DifficultyLevels.length === 0 ||
        gameDifficulty[challenge.DifficultyLevels[0]] <= difficulty
    )
}

/**
 * Judges whether a challenge should be included in the challenges list of a contract.
 * Requires the challenge and the contract share the same parent location.
 * Will throw if the contract is not found.
 *
 * @param contractId The id of the contract.
 * @param locationId The sublocation ID of the challenge.
 * @param difficulty The upper bound on the difficulty of the challenges to return.
 * @param gameVersion The game version.
 * @param challenge The challenge in question.
 * @param pro1Filter Settings for handling pro1 challenges.
 * @param forCareer Whether the result is used to decide what is shown the CAREER -> CHALLENGES page. Defaulted to false.
 * @returns A boolean value, denoting the result.
 */
function isChallengeInContract(
    contractId: string,
    locationId: string,
    difficulty: number,
    gameVersion: GameVersion,
    challenge: RegistryChallenge,
    pro1Filter: Pro1FilterType,
    forCareer = false,
): boolean {
    if (!contractId || !locationId) {
        return false
    }

    if (!challenge) {
        return false
    }

    if (!isChallengeForDifficulty(difficulty, challenge)) {
        return false
    }

    const groupContract = controller.resolveContract(
        contractId,
        gameVersion,
        true,
    )
    const individualContract = controller.resolveContract(
        contractId,
        gameVersion,
    )

    assert.ok(
        individualContract,
        `Can't find contract ${contractId} for ${gameVersion}, but need to check if challenge ${challenge.Id} belongs to it`,
    )

    if (challenge.Type === "global") {
        return inclusionDataCheck(
            // Global challenges should not be shown for "tutorial" missions unless for the career page,
            // despite the InclusionData somehow saying otherwise.
            forCareer
                ? challenge.InclusionData
                : {
                      ...challenge.InclusionData,
                      ContractTypes:
                          challenge.InclusionData?.ContractTypes?.filter(
                              (type) => type !== "tutorial",
                          ) || undefined,
                  },
            groupContract,
        )
    }

    if (
        challenge.Tags.includes("elusive") &&
        groupContract?.Metadata.Type !== "elusive"
    ) {
        return false
    }

    // Is this for the current contract or group contract?
    const isForContract = (challenge.InclusionData?.ContractIds || []).includes(
        groupContract?.Metadata.Id || "",
    )

    // Is this for the current contract type?
    // As of v6.1.0, this is only used for ET challenges.
    // We have to resolve the non-group contract, `groupContract` is the group contract
    const isForContractType = (
        challenge.InclusionData?.ContractTypes || []
    ).includes(individualContract.Metadata.Type)

    // Is this a location-wide challenge?
    // "location" is more widely used, but "parentlocation" is used in Ambrose and Berlin, as well as some "Discover XX" challenges.
    const isForLocation =
        challenge.Type === "location" || challenge.Type === "parentlocation"

    // Is this for the current location?
    const isCurrentLocation =
        // Is this challenge's location one of these things:
        // 1. The current sub-location, e.g. "LOCATION_COASTALTOWN_NIGHT". This is the most common.
        // 2. The parent location (yup, that can happen), e.g. "LOCATION_PARENT_HOKKAIDO" in Discover Hokkaido.
        challenge.LocationId === locationId ||
        challenge.LocationId === challenge.ParentLocationId

    const isPro1 = challenge.Tags.includes("pro1")

    if (isPro1 && pro1Filter === Pro1FilterType.Exclude) {
        return false
    } else if (!isPro1 && pro1Filter === Pro1FilterType.Only) {
        return false
    }

    return (
        isForContract ||
        isForContractType ||
        (isForLocation && isCurrentLocation)
    )
}

export function filterChallenge(
    options: ChallengeFilterOptions,
    challenge: RegistryChallenge,
): boolean {
    switch (options.type) {
        case ChallengeFilterType.None:
            return true
        case ChallengeFilterType.Contract: {
            return isChallengeInContract(
                options.contractId,
                options.locationId,
                options.difficulty,
                options.gameVersion,
                challenge,
                options.pro1Filter,
            )
        }
        case ChallengeFilterType.Contracts: {
            if (
                options.contractIds.some((contractId) =>
                    isChallengeInContract(
                        contractId,
                        options.locationId,
                        gameDifficulty.master, // Get challenges of all difficulties
                        options.gameVersion,
                        challenge,
                        options.pro1Filter,
                        true,
                    ),
                )
            ) {
                return true
            } else if (
                // If the location has an ET that appeared in an ETA, then all global arcade challenges are shown
                controller.locationsWithETA.has(options.locationId) &&
                challenge.Tags.includes("arcade") &&
                challenge.Type === "global"
            ) {
                return true
            }

            return false
        }
        case ChallengeFilterType.ContractType: {
            return (
                challenge.InclusionData?.ContractTypes?.includes(
                    options.contractType,
                ) ?? false
            )
        }
        case ChallengeFilterType.ParentLocation: {
            // Challenges are already organized by parent location
            // But they contain elusive target challenges, which need to be filtered out
            if (challenge.Tags.includes("elusive")) {
                return false
            }

            if (challenge.Tags.includes("arcade")) {
                return (
                    challenge.ParentLocationId === options.parent ||
                    (challenge.ParentLocationId === "" &&
                        controller.parentsWithETA.has(options.parent))
                )
            }

            if (challenge.Tags.includes("escalation")) {
                if (options.pro1Filter === Pro1FilterType.Only) {
                    return false
                }

                return (
                    !isSniperLocation(options.parent) &&
                    "LOCATION_PARENT_SNUG" !== options.parent
                )
            }

            const isPro1 = challenge.Tags.includes("pro1")

            if (isPro1 && options.pro1Filter === Pro1FilterType.Exclude) {
                return false
            } else if (!isPro1 && options.pro1Filter === Pro1FilterType.Only) {
                return false
            }

            return true
        }
    }
}

/**
 * Merges the Challenge field two SavedChallengeGroup objects and returns a new object. Does not modify the original objects. For all the other fields, the values of g1 is used.
 * @param g1 One of the SavedChallengeGroup objects.
 * @param g2 The other SavedChallengeGroup object.
 * @returns A new object with the Challenge arrays merged.
 */
export function mergeSavedChallengeGroups(
    g1: SavedChallengeGroup,
    g2?: SavedChallengeGroup,
): SavedChallengeGroup {
    return {
        ...g1,
        Challenges: [...(g1?.Challenges ?? []), ...(g2?.Challenges ?? [])],
    }
}
