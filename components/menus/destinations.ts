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

import { getConfig, getVersionedConfig } from "../configSwizzleManager"
import type {
    CompletionData,
    GameLocationsData,
    GameVersion,
    MissionStory,
    PeacockLocationsData,
    RequestWithJwt,
    Unlockable,
} from "../types/types"
import { controller } from "../controller"
import { generateCompletionData } from "../contracts/dataGen"
import { getUserData } from "components/databaseHandler"

type GameFacingDestination = {
    ChallengeCompletion: {
        ChallengesCount: number
        CompletedChallengesCount: number
    }
    CompletionData: CompletionData
    OpportunityStatistics: {
        Count: number
        Completed: number
    }
    LocationCompletionPercent: number
    Location: Unlockable
}
const missionStories = getConfig<Record<string, MissionStory>>(
    "MissionStories",
    false,
)

export function destinationsMenu(req: RequestWithJwt): GameFacingDestination[] {
    const result: GameFacingDestination[] = []
    const userData = getUserData(req.jwt.unique_name, req.gameVersion)
    const locations = getVersionedConfig<PeacockLocationsData>(
        "LocationsData",
        req.gameVersion,
        true,
    )
    for (const [destination, parent] of Object.entries(locations.parents)) {
        parent.GameAsset = null
        parent.DisplayNameLocKey =
            "UI_LOCATION_PARENT_" + destination.substring(16) + "_NAME"

        const template = {
            ChallengeCompletion: {
                ChallengesCount: 0,
                CompletedChallengesCount: 0, // TODO: Hook this up to challenge counts.
            },
            CompletionData: generateCompletionData(
                destination,
                req.jwt.unique_name,
                req.gameVersion,
            ),
            OpportunityStatistics: {
                Count: 0,
                Completed: 0,
            },
            LocationCompletionPercent: 0,
            Location: parent,
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
        true,
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
