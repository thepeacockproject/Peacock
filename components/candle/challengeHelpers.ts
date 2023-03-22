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

import {
    ChallengeProgressionData,
    CompiledChallengeRewardData,
    CompiledChallengeRuntimeData,
    InclusionData,
    MissionManifest,
    RegistryChallenge,
} from "../types/types"
import assert from "assert"
import { SavedChallengeGroup } from "../types/challenges"
import { controller } from "../controller"
import { gameDifficulty } from "../utils"

export function compileScoringChallenge(
    challenge: RegistryChallenge,
): CompiledChallengeRewardData {
    return {
        ChallengeId: challenge.Id,
        ChallengeName: challenge.Name,
        ChallengeDescription: challenge.Description,
        ChallengeImageUrl: challenge.ImageName,
        XPGain: challenge.Rewards?.MasteryXP || 0,
    }
}

export function compileRuntimeChallenge(
    challenge: RegistryChallenge,
    progression: ChallengeProgressionData,
): CompiledChallengeRuntimeData {
    return {
        // GetActiveChallengesAndProgression
        Challenge: {
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
        },
        Progression: progression,
    }
}

export enum ChallengeFilterType {
    None = "None",
    Contract = "Contract",
    /** Only used for the CAREER -> CHALLENGES page */
    Contracts = "Contracts",
}

export type ChallengeFilterOptions =
    | {
          type: ChallengeFilterType.None
      }
    | {
          type: ChallengeFilterType.Contract
          contractId: string
          locationId: string
          difficulty: number
      }
    | {
          type: ChallengeFilterType.Contracts
          contractIds: string[]
          locationId: string
      }

/**
 * Checks if the metadata of a contract matches the definition in the InclusionData of a challenge.
 * @param incData The inclusion data of the challenge in question. Will return true if this is null.
 * @param contract The contract in question.
 * @returns A boolean as the result.
 */
export function inclusionDataCheck(
    incData: InclusionData,
    contract: MissionManifest,
): boolean {
    if (!incData) return true

    return (
        incData.ContractIds?.includes(contract.Metadata.Id) ||
        incData.ContractTypes?.includes(contract.Metadata.Type) ||
        incData.Locations?.includes(contract.Metadata.Location) ||
        contract.Metadata?.Gamemodes?.some((r) =>
            incData.GameModes?.includes(r),
        )
    )
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
 * @requires The challenge and the contract share the same parent location.
 * @param contractId The id of the contract.
 * @param locationId The sublocation ID of the challenge.
 * @param difficulty The upper bound on the difficulty of the challenges to return.
 * @param challenge The challenge in question.
 * @param forCareer Whether the result is used to decide what is shown the CAREER -> CHALLENGES page. Defaulted to false.
 * @returns A boolean value, denoting the result.
 */
function isChallengeInContract(
    contractId: string,
    locationId: string,
    difficulty: number,
    challenge: RegistryChallenge,
    forCareer = false,
): boolean {
    assert.ok(contractId)
    assert.ok(locationId)
    if (!challenge) {
        return false
    }

    if (!isChallengeForDifficulty(difficulty, challenge)) {
        return false
    }

    if (
        locationId === "LOCATION_HOKKAIDO_SHIM_MAMUSHI" &&
        challenge.LocationId === "LOCATION_HOKKAIDO"
    ) {
        // Special case: winter festival has its own locationId, but for Hokkaido-wide challenges,
        // the locationId is "LOCATION_HOKKAIDO",  not "LOCATION_PARENT_HOKKAIDO".
        return true
    }

    if (challenge.Type === "global") {
        return inclusionDataCheck(
            // Global challenges should not be shown for "tutorial" missions unless for the career page,
            // despite the InclusionData somehow saying otherwise.
            forCareer
                ? challenge.InclusionData
                : {
                      ...challenge.InclusionData,
                      ContractTypes:
                          challenge.InclusionData.ContractTypes.filter(
                              (type) => type !== "tutorial",
                          ),
                  },
            controller.resolveContract(contractId),
        )
    }

    // Is this for the current contract?
    const isForContract = (challenge.InclusionData?.ContractIds || []).includes(
        contractId,
    )

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

    return isForContract || (isForLocation && isCurrentLocation)
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
                challenge,
            )
        }
        case ChallengeFilterType.Contracts: {
            return options.contractIds.some((contractId) =>
                isChallengeInContract(
                    contractId,
                    options.locationId,
                    gameDifficulty.master, // Get challenges of all difficulties
                    challenge,
                    true,
                ),
            )
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
    g2: SavedChallengeGroup,
): SavedChallengeGroup {
    return {
        ...g1,
        Challenges: [...(g1?.Challenges ?? []), ...(g2?.Challenges ?? [])],
    }
}
