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

import { getConfig, getVersionedConfig } from "../configSwizzleManager"
import type {
    ChallengeCompletion,
    CompiledChallengeTreeCategory,
    CompletionData,
    GameLocationsData,
    GameVersion,
    Hit,
    MissionStory,
    OpportunityStatistics,
    PeacockLocationsData,
    Unlockable,
} from "../types/types"
import type { MasteryData } from "../types/mastery"
import { contractIdToHitObject, controller } from "../controller"
import { generateCompletionData } from "../contracts/dataGen"
import { getUserData } from "../databaseHandler"
import { ChallengeFilterType } from "../candle/challengeHelpers"
import { GetDestinationQuery } from "../types/gameSchemas"
import { createInventory } from "../inventory"
import { log, LogLevel } from "../loggingInterop"
import { no2016 } from "../contracts/escalations/escalationService"
import { missionsInLocations } from "../contracts/missionsInLocation"
import assert from "assert"
import { translateEntitlements } from "../ownership"

type LegacyData = {
    [difficulty: string]: {
        ChallengeCompletion: {
            ChallengesCount: number
            CompletedChallengesCount: number
        }
        CompletionData: CompletionData
    }
}

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
    Data?: LegacyData
}

type LocationMissionData = {
    Location: Unlockable
    SubLocation: Unlockable
    Missions: Hit[]
    SarajevoSixMissions: Hit[]
    ElusiveMissions: Hit[]
    EscalationMissions: Hit[]
    SniperMissions: Hit[]
    PlaceholderMissions: Hit[]
    CampaignMissions: Hit[]
    CompletionData: CompletionData
}

type GameDestination = {
    ChallengeData: {
        Children: CompiledChallengeTreeCategory[]
    }
    DifficultyData: {
        AvailableDifficultyModes: {
            Name: string
            Available: boolean
        }[]
        Difficulty: string | undefined
        LocationId: string
    }
    Location: Unlockable
    MasteryData: MasteryData | MasteryData[] | Record<string, never>
    MissionData: {
        ChallengeCompletion: ChallengeCompletion
        Location: Unlockable
        LocationCompletionPercent: number
        OpportunityStatistics: {
            Completed: number
            Count: number
        }
        SubLocationMissionsData: LocationMissionData[]
    }
}

export function getDestinationCompletion(
    parent: Unlockable,
    child: Unlockable | undefined,
    gameVersion: GameVersion,
    userId: string,
) {
    const missionStories = getConfig<Record<string, MissionStory>>(
        "MissionStories",
        false,
    )

    const userData = getUserData(userId, gameVersion)
    const challenges = controller.challengeService.getGroupedChallengeLists(
        {
            type: ChallengeFilterType.ParentLocation,
            parent: parent.Id,
        },
        parent.Id,
        gameVersion,
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
            gameVersion,
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
    challengeDone ??= 0
    challengeTotal ??= 0
    opportunityDone ??= 0
    opportunityTotal ??= 0

    const totalCompletables = challengeTotal + opportunityTotal
    const totalCompleted = challengeDone + opportunityDone
    return totalCompletables === 0
        ? 0
        : (100 * totalCompleted) / totalCompletables
}

/**
 * Get the list of destinations used by the `/profiles/page/Destinations` endpoint.
 *
 * @param gameVersion
 * @param userId The user ID.
 */
export function getAllGameDestinations(
    gameVersion: GameVersion,
    userId: string,
): GameFacingDestination[] {
    const result: GameFacingDestination[] = []
    const locations = getVersionedConfig<PeacockLocationsData>(
        "LocationsData",
        gameVersion,
        true,
    )

    for (const [destination, parent] of Object.entries(locations.parents)) {
        parent.GameAsset = null
        parent.DisplayNameLocKey =
            "UI_LOCATION_PARENT_" + destination.substring(16) + "_NAME"

        const template: GameFacingDestination = {
            ...getDestinationCompletion(parent, undefined, gameVersion, userId),
            ...{
                CompletionData: generateCompletionData(
                    destination,
                    userId,
                    gameVersion,
                ),
            },
        }

        // TODO: THIS IS NOT CORRECT FOR 2016!
        // There are different challenges for normal and pro1 in 2016, right now, we do not support this.
        // We're just reusing this for now.
        if (gameVersion === "h1") {
            template.Data = {
                normal: {
                    ChallengeCompletion: template.ChallengeCompletion,
                    CompletionData: generateCompletionData(
                        destination,
                        userId,
                        gameVersion,
                        "mission",
                        "normal",
                    ),
                },
                pro1: {
                    ChallengeCompletion: template.ChallengeCompletion,
                    CompletionData: generateCompletionData(
                        destination,
                        userId,
                        gameVersion,
                        "mission",
                        "pro1",
                    ),
                },
            } satisfies LegacyData
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

        if (!sublocation.Properties.ParentLocation) {
            assert.fail("sublocation has no parent, that's illegal")
        }

        const parentLocation =
            locData.parents[sublocation.Properties.ParentLocation]
        const creationContract = controller.resolveContract(
            sublocation.Properties.CreateContractId!,
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
            creationContract.Metadata.Entitlements = translateEntitlements(
                gameVersion,
                creationContract.Metadata.Entitlements,
            )
            toAdd.Contract = creationContract
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        finalData.Data.Locations.push(toAdd as any)
    }

    return finalData
}

/**
 * This gets the game-facing data for a destination.
 *
 * @param query
 * @param gameVersion
 * @param userId
 */
export function getDestination(
    query: GetDestinationQuery,
    gameVersion: GameVersion,
    userId: string,
): GameDestination {
    const LOCATION = query.locationId

    const locData = getVersionedConfig<PeacockLocationsData>(
        "LocationsData",
        gameVersion,
        false,
    )

    const locationData = locData.parents[LOCATION]
    const masteryData = controller.masteryService.getMasteryDataForDestination(
        query.locationId,
        gameVersion,
        userId,
        query.difficulty,
    )

    let resMasteryData: GameDestination["MasteryData"]

    if (LOCATION !== "LOCATION_PARENT_ICA_FACILITY") {
        if (gameVersion === "h1") {
            resMasteryData = masteryData[0]
        } else {
            resMasteryData = masteryData
        }
    } else {
        resMasteryData = {}
    }

    const response: Partial<GameDestination> = {
        Location: locationData,
        MissionData: {
            ...getDestinationCompletion(
                locationData,
                undefined,
                gameVersion,
                userId,
            ),
            ...{ SubLocationMissionsData: [] },
        },
        ChallengeData: {
            Children:
                controller.challengeService.getChallengeDataForDestination(
                    query.locationId,
                    gameVersion,
                    userId,
                ),
        },
        MasteryData: resMasteryData,
    }

    if (gameVersion === "h1" && LOCATION !== "LOCATION_PARENT_ICA_FACILITY") {
        const inventory = createInventory(userId, gameVersion)

        response.DifficultyData = {
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
                            locationData.Properties.DifficultyUnlock?.pro1,
                    ),
                },
            ],
            Difficulty: query.difficulty,
            LocationId: LOCATION,
        }
    }

    log(LogLevel.DEBUG, `Looking up locations details for ${LOCATION}.`)

    const sublocationsData = Object.values(locData.children).filter(
        (subLocation) => subLocation.Properties.ParentLocation === LOCATION,
    )

    if (query.difficulty === "pro1") {
        type Cast = keyof typeof controller.missionsInLocations.pro1

        const obj: LocationMissionData = {
            Location: locationData,
            SubLocation: locationData,
            Missions: [controller.missionsInLocations.pro1[LOCATION as Cast]]
                .map((id) => contractIdToHitObject(id, gameVersion, userId))
                .filter(Boolean) as Hit[],
            SarajevoSixMissions: [],
            ElusiveMissions: [],
            EscalationMissions: [],
            SniperMissions: [],
            PlaceholderMissions: [],
            CampaignMissions: [],
            CompletionData: generateCompletionData(
                sublocationsData[0].Id,
                userId,
                gameVersion,
            ),
        }

        response.MissionData?.SubLocationMissionsData.push(obj)

        return response as GameDestination
    }

    for (const e of sublocationsData) {
        log(LogLevel.DEBUG, `Looking up sublocation details for ${e.Id}`)

        const escalations: Hit[] = []

        type ECast = keyof typeof controller.missionsInLocations.escalations
        // every unique escalation from the sublocation
        const allUniqueEscalations: string[] = [
            ...(gameVersion === "h1" && e.Id === "LOCATION_ICA_FACILITY"
                ? controller.missionsInLocations.escalations[
                      "LOCATION_ICA_FACILITY_SHIP"
                  ]
                : []),
            ...new Set<string>(
                controller.missionsInLocations.escalations[e.Id as ECast] || [],
            ),
        ]

        for (const escalation of allUniqueEscalations) {
            if (gameVersion === "h1" && no2016.includes(escalation)) continue

            const details = contractIdToHitObject(
                escalation,
                gameVersion,
                userId,
            )

            if (details) {
                escalations.push(details)
            }
        }

        const sniperMissions: Hit[] = []
        type SCast = keyof typeof controller.missionsInLocations.sniper

        for (const sniperMission of controller.missionsInLocations.sniper[
            e.Id as SCast
        ] ?? []) {
            const hit = contractIdToHitObject(
                sniperMission,
                gameVersion,
                userId,
            )

            if (hit) sniperMissions.push(hit)
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
            CompletionData: generateCompletionData(e.Id, userId, gameVersion),
        }

        const types = [
            ...[
                [undefined, "Missions"],
                ["elusive", "ElusiveMissions"],
            ],
            ...((gameVersion === "h1" &&
                // @ts-expect-error Hack.
                missionsInLocations.sarajevo["h2016enabled"]) ||
            gameVersion === "h3"
                ? [["sarajevo", "SarajevoSixMissions"]]
                : []),
        ]

        for (const t of types) {
            let theMissions: string[] | undefined = !t[0] // no specific type
                ? // @ts-expect-error Yup.
                  controller.missionsInLocations[e.Id]
                : // @ts-expect-error Yup.
                  controller.missionsInLocations[t[0]][e.Id]

            // edge case: ica facility in h1 was only 1 sublocation, so we merge
            // these into a single array
            if (
                gameVersion === "h1" &&
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

            if (theMissions) {
                for (const c of theMissions.filter(
                    // removes snow festival on h1
                    (m) =>
                        m &&
                        !(
                            gameVersion === "h1" &&
                            m === "c414a084-a7b9-43ce-b6ca-590620acd87e"
                        ),
                )) {
                    const mission = contractIdToHitObject(
                        c,
                        gameVersion,
                        userId,
                    )

                    // @ts-expect-error Yup.
                    obj[t[1]].push(mission)
                }
            }
        }

        response.MissionData?.SubLocationMissionsData.push(obj)
    }

    return response as GameDestination
}
