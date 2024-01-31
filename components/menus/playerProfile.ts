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
    ChallengeCategoryCompletion,
    GameVersion,
    PeacockLocationsData,
    PlayerProfileView,
    ProgressionData,
} from "../types/types"
import { generateCompletionData } from "../contracts/dataGen"
import { controller } from "../controller"
import { getDestinationCompletion } from "./destinations"
import { getUserData } from "../databaseHandler"
import { isSniperLocation } from "../utils"

export function getPlayerProfileData(
    gameVersion: GameVersion,
    userId: string,
): PlayerProfileView {
    const playerProfilePage = getConfig<PlayerProfileView>(
        "PlayerProfilePage",
        true,
    )

    const locationData = getVersionedConfig<PeacockLocationsData>(
        "LocationsData",
        gameVersion,
        false,
    )

    playerProfilePage.SubLocationData = []

    for (const subLocationKey in locationData.children) {
        // Ewww...
        if (
            subLocationKey === "LOCATION_ICA_FACILITY_ARRIVAL" ||
            subLocationKey.includes("SNUG_")
        ) {
            continue
        }

        const subLocation = locationData.children[subLocationKey]
        const parentLocation =
            locationData.parents[subLocation.Properties.ParentLocation || ""]

        const completionData = generateCompletionData(
            subLocation.Id,
            userId,
            gameVersion,
        )

        // TODO: Make getDestinationCompletion do something like this.
        const challenges = controller.challengeService.getChallengesForLocation(
            subLocation.Id,
            gameVersion,
        )

        const challengeCategoryCompletion: ChallengeCategoryCompletion[] = []

        for (const challengeGroup in challenges) {
            const challengeCompletion =
                controller.challengeService.countTotalNCompletedChallenges(
                    {
                        challengeGroup: challenges[challengeGroup],
                    },
                    userId,
                    gameVersion,
                )

            challengeCategoryCompletion.push({
                Name: challenges[challengeGroup][0].CategoryName,
                ...challengeCompletion,
            })
        }

        const destinationCompletion = getDestinationCompletion(
            parentLocation,
            subLocation,
            gameVersion,
            userId,
        )

        playerProfilePage.SubLocationData.push({
            ParentLocation: parentLocation,
            Location: subLocation,
            CompletionData: completionData,
            ChallengeCategoryCompletion: challengeCategoryCompletion,
            ChallengeCompletion: destinationCompletion.ChallengeCompletion,
            OpportunityStatistics: destinationCompletion.OpportunityStatistics,
            LocationCompletionPercent:
                destinationCompletion.LocationCompletionPercent,
        })
    }

    const userProfile = getUserData(userId, gameVersion)
    playerProfilePage.PlayerProfileXp.Total =
        userProfile.Extensions.progression.PlayerProfileXP.Total
    playerProfilePage.PlayerProfileXp.Level =
        userProfile.Extensions.progression.PlayerProfileXP.ProfileLevel

    const subLocationMap = new Map(
        userProfile.Extensions.progression.PlayerProfileXP.Sublocations.map(
            (obj) => [obj.Location, obj],
        ),
    )

    for (const season of playerProfilePage.PlayerProfileXp.Seasons) {
        for (const location of season.Locations) {
            const subLocationData = subLocationMap.get(location.LocationId)

            location.Xp = subLocationData?.Xp || 0
            location.ActionXp = subLocationData?.ActionXp || 0

            if (
                location.LocationProgression &&
                !isSniperLocation(location.LocationId)
            ) {
                // We typecast below as it could be an object for subpackages.
                // Checks before this ensure it isn't, but TS doesn't realise this.
                location.LocationProgression.Level =
                    (
                        userProfile.Extensions.progression.Locations[
                            location.LocationId
                        ] as ProgressionData
                    ).Level || 1
            }
        }
    }

    return playerProfilePage
}
