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
    RegistryChallenge,
} from "../types/types"
import assert from "assert"

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
      }
    | {
          type: ChallengeFilterType.Contracts
          contractIds: string[]
          locationId: string
      }

/**
 * Judges whether a challenge should be included in the challenges list of a contract.
 * @requires The challenge and the contract share the same parent location.
 * @param contractId The id of the contract.
 * @param locationId The sublocation ID of the challenge.
 * @param challenge The challenge in question.
 * @returns A boolean value, denoting the result.
 */
function isChallengeInContract(
    contractId: string,
    locationId: string,
    challenge: RegistryChallenge,
): boolean {
    assert.ok(contractId)
    assert.ok(locationId)
    if (!challenge) {
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
                challenge,
            )
        }
        case ChallengeFilterType.Contracts: {
            return options.contractIds.some((contractId) =>
                isChallengeInContract(
                    contractId,
                    options.locationId,
                    challenge,
                ),
            )
        }
    }
}
