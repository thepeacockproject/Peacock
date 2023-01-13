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
    ParentLocation = "ParentLocation",
}

export type ChallengeFilterOptions =
    | {
          type: ChallengeFilterType.None
      }
    | {
          type: ChallengeFilterType.Contract
          contractId: string
          locationId: string
          locationParentId: string
      }
    | {
          type: ChallengeFilterType.Contracts
          contractIds: string[]
          locationId: string
          locationParentId: string
      }
    | {
          type: ChallengeFilterType.ParentLocation
          locationParentId: string
      }

function isChallengeInContract(
    contractId: string,
    locationId: string,
    locationParentId: string,
    challenge: RegistryChallenge,
) {
    assert.ok(contractId)
    assert.ok(locationId)
    assert.ok(locationParentId)
    if (!challenge) {
        return false
    }

    // is this for the current contract?
    const isForContract = (challenge.InclusionData?.ContractIds || []).includes(
        contractId,
    )

    // is this a location-wide challenge?
    const isForLocation = challenge.Type === "location"

    // is this for the current location?
    const isCurrentLocation =
        // is this challenge for the current parent location?
        challenge.ParentLocationId === locationParentId &&
        // and, is this challenge's location the current sub-location
        // or the parent location? (yup, that can happen)
        (challenge.LocationId === locationId ||
            challenge.LocationId === locationParentId)

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
                options.locationParentId,
                challenge,
            )
        }
        case ChallengeFilterType.Contracts: {
            return options.contractIds.some((contractId) =>
                isChallengeInContract(
                    contractId,
                    options.locationId,
                    options.locationParentId,
                    challenge,
                ),
            )
        }
        case ChallengeFilterType.ParentLocation:
            assert.ok(options.locationParentId)

            return (
                (challenge?.ParentLocationId || "") === options.locationParentId
            )
    }
}
