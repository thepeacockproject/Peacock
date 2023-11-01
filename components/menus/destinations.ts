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
    GameLocationsData,
    GameVersion,
    MissionStory,
    OpportunityStatistics,
    PeacockLocationsData,
    RequestWithJwt,
    Unlockable,
} from "../types/types"
import { controller } from "../controller"
import { generateCompletionData } from "../contracts/dataGen"
import { getUserData } from "../databaseHandler"
import { ChallengeFilterType } from "../candle/challengeHelpers"

type GameFacingDestination = {
    ChallengeCompletion: {
        ChallengesCount: number
        CompletedChallengesCount: number
    }
    CompletionData: CompletionData
    OpportunityStatistics: OpportunityStatistics
    LocationCompletionPercent: number
    Location: Unlockable
    // H2016 only
    Data?: {
        [difficulty: string]: {
            ChallengeCompletion: {
                ChallengesCount: number
                CompletedChallengesCount: number
            }
            CompletionData: CompletionData
        }
    }
}
const missionStories = getConfig<Record<string, MissionStory>>(
    "MissionStories",
    false,
)

export function getDestinationCompletion(
    parent: Unlockable,
    child: Unlockable | undefined,
    req: RequestWithJwt,
) {
    const userData = getUserData(req.jwt.unique_name, req.gameVersion)
    const challenges = controller.challengeService.getGroupedChallengeLists(
        {
            type: ChallengeFilterType.ParentLocation,
            parent: parent.Id,
        },
        parent.Id,
        req.gameVersion,
    )

    const opportunities = Object.values(missionStories)
        .filter((e) =>
            child ? e.SubLocation === child.Id : e.Location === parent.Id,
        )
        .map((e) => e.CommonRepositoryId)

    let opportunityCompletedCount = 0

    for (const ms in userData.Extensions.opportunityprogression) {
        if (opportunities.includes(ms)) {
            opportunityCompletedCount++
        }
    }

    const challengeCompletion =
        controller.challengeService.countTotalNCompletedChallenges(
            challenges,
            userData.Id,
            req.gameVersion,
        )

    return {
        ChallengeCompletion: challengeCompletion,
        OpportunityStatistics: {
            Count: opportunities.length,
            Completed: opportunityCompletedCount,
        },
        LocationCompletionPercent: getCompletionPercent(
            challengeCompletion.CompletedChallengesCount,
            challengeCompletion.ChallengesCount,
            opportunityCompletedCount,
            opportunities.length,
        ),
        Location: parent,
    }
}

export function getCompletionPercent(
    challengeDone: number,
    challengeTotal: number,
    opportunityDone: number,
    opportunityTotal: number,
): number {
    if (challengeDone === undefined) {
        challengeDone = 0
    }

    if (challengeTotal === undefined) {
        challengeTotal = 0
    }

    if (opportunityDone === undefined) {
        opportunityDone = 0
    }

    if (opportunityTotal === undefined) {
        opportunityTotal = 0
    }

    const totalCompletables = challengeTotal + opportunityTotal
    const totalCompleted = challengeDone + opportunityDone
    return totalCompletables === 0
        ? 0
        : (100 * totalCompleted) / totalCompletables
}

export function destinationsMenu(req: RequestWithJwt): GameFacingDestination[] {
    const result: GameFacingDestination[] = []
    const locations = getVersionedConfig<PeacockLocationsData>(
        "LocationsData",
        req.gameVersion,
        true,
    )

    for (const [destination, parent] of Object.entries(locations.parents)) {
        parent.GameAsset = null
        parent.DisplayNameLocKey =
            "UI_LOCATION_PARENT_" + destination.substring(16) + "_NAME"

        const template: GameFacingDestination = {
            ...getDestinationCompletion(parent, undefined, req),
            ...{
                CompletionData: generateCompletionData(
                    destination,
                    req.jwt.unique_name,
                    req.gameVersion,
                ),
                Data:
                    req.gameVersion === "h1"
                        ? {
                              normal: {
                                  ChallengeCompletion: undefined,
                                  CompletionData: generateCompletionData(
                                      destination,
                                      req.jwt.unique_name,
                                      req.gameVersion,
                                      "mission",
                                      "normal",
                                  ),
                              },
                              pro1: {
                                  ChallengeCompletion: undefined,
                                  CompletionData: generateCompletionData(
                                      destination,
                                      req.jwt.unique_name,
                                      req.gameVersion,
                                      "mission",
                                      "pro1",
                                  ),
                              },
                          }
                        : undefined,
            },
        }

        // TODO: THIS IS NOT CORRECT FOR 2016!
        // There are different challenges for normal and pro1 in 2016, right now, we do not support this.
        // We're just reusing this for now.
        if (req.gameVersion === "h1") {
            template.Data.normal.ChallengeCompletion =
                template.ChallengeCompletion
            template.Data.pro1.ChallengeCompletion =
                template.ChallengeCompletion
        }

        result.push(template)
    }

    return result
}

/**
 * Creates the game's LocationsData object, and optionally removes locations
 * that don't provide a contract creation ID.
 *
 * @param gameVersion The game version.
 * @param excludeIfNoContracts If true, locations that don't support contract
 * creation will not be returned.
 * @returns The locations that can be played.
 */
export function createLocationsData(
    gameVersion: GameVersion,
    excludeIfNoContracts = false,
): GameLocationsData {
    const locData = getVersionedConfig<PeacockLocationsData>(
        "LocationsData",
        gameVersion,
        false,
    )

    const allSublocationIds = Object.keys(locData.children)

    const finalData: GameLocationsData = {
        Data: {
            HasMore: false,
            Page: 0,
            Locations: [],
        },
    }

    for (const sublocationId of allSublocationIds) {
        if (
            sublocationId === "LOCATION_TRAPPED_WOLVERINE" ||
            sublocationId.includes("SNUG")
        ) {
            continue
        }

        const sublocation = locData.children[sublocationId]
        const parentLocation =
            locData.parents[sublocation.Properties.ParentLocation]
        const creationContract = controller.resolveContract(
            sublocation.Properties.CreateContractId,
        )

        if (!creationContract && excludeIfNoContracts) {
            continue
        }

        const toAdd = {
            Location: parentLocation,
            SubLocation: sublocation,
            Contract: {
                Metadata: {},
                Data: {},
            },
        }

        if (creationContract) {
            toAdd.Contract = creationContract
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        finalData.Data.Locations.push(toAdd as any)
    }

    return finalData
}
