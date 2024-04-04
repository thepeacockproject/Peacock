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
    ChallengeCompletion,
    CompletionData,
    GameVersion,
    PeacockLocationsData,
    Unlockable,
} from "../types/types"
import { swapToBrowsingMenusStatus } from "../discord/discordRp"
import { getUserData } from "../databaseHandler"
import { controller } from "../controller"
import { contractCreationTutorialId, getMaxProfileLevel } from "../utils"
import { getVersionedConfig } from "../configSwizzleManager"
import {
    generateCompletionData,
    generateUserCentric,
} from "../contracts/dataGen"
import { createLocationsData, getAllGameDestinations } from "./destinations"
import { makeCampaigns } from "./campaigns"

type CareerEntry = {
    Children: CareerEntryChild[]
    Name: string
    Location: Unlockable
}

type CareerEntryChild = {
    IsLocked: boolean
    Name: string
    Image: string
    Icon: string
    CompletedChallengesCount: number
    ChallengesCount: number
    CategoryId: string
    Description: string
    Location: Unlockable
    ImageLocked: string
    RequiredResources: string[]
    IsPack?: boolean
    CompletionData: CompletionData | Record<string, never>
}

function generateCareerEntryChild(
    location: Unlockable,
    completion: ChallengeCompletion,
    categoryId: string,
    completionData?: CompletionData,
): CareerEntryChild {
    const pack = controller.challengeService.challengePacks.get(categoryId)

    return {
        IsLocked: Boolean(location.Properties.IsLocked),
        Name: pack ? pack.Name : location.DisplayNameLocKey,
        Image: pack ? pack.Image : location.Properties.Icon || "",
        Icon: pack ? pack.Icon : location.Type,
        CompletedChallengesCount: completion.CompletedChallengesCount,
        ChallengesCount: completion.ChallengesCount,
        CategoryId: categoryId,
        Description: pack ? pack.Description : `UI_${categoryId}_PRIMARY_DESC`,
        Location: location,
        ImageLocked: location.Properties.LockedIcon || "",
        RequiredResources: location.Properties.RequiredResources || [],
        IsPack: pack !== undefined,
        CompletionData: completionData || {},
    }
}

export function getHubData(gameVersion: GameVersion, userId: string) {
    swapToBrowsingMenusStatus(gameVersion)

    const userdata = getUserData(userId, gameVersion)

    const contractCreationTutorial =
        gameVersion !== "scpc"
            ? controller.resolveContract(contractCreationTutorialId)!
            : undefined

    const locations = getVersionedConfig<PeacockLocationsData>(
        "LocationsData",
        gameVersion,
        true,
    )

    const career: Record<string, CareerEntry> = {}

    for (const [
        id,
        pack,
    ] of controller.challengeService.challengePacks.entries()) {
        if (!pack.GameVersions.includes(gameVersion)) continue

        career[id] = {
            Children: [
                generateCareerEntryChild(
                    locations.parents["LOCATION_PARENT_ICA_FACILITY"],
                    controller.challengeService.countTotalNCompletedChallenges(
                        controller.challengeService.getChallengesForGroup(
                            id,
                            gameVersion,
                        ),
                        userId,
                        gameVersion,
                    ),
                    id,
                ),
            ],
            Name: pack.Name,
            Location: locations.parents["LOCATION_PARENT_ICA_FACILITY"],
        }
    }

    const masteryData = []

    for (const parent in locations.parents) {
        career[parent] = {
            Children: [],
            Location: locations.parents[parent],
            Name: locations.parents[parent].DisplayNameLocKey,
        }

        // Exclude ICA Facility from showing in the Career -> Mastery page
        if (parent === "LOCATION_PARENT_ICA_FACILITY") continue

        if (
            controller.masteryService.getMasteryDataForDestination(
                parent,
                gameVersion,
                userId,
            ).length
        ) {
            const completionData =
                controller.masteryService.getLocationCompletion(
                    parent,
                    parent,
                    gameVersion,
                    userId,
                    parent.includes("SNUG") ? "evergreen" : "mission",
                    gameVersion === "h1" ? "normal" : undefined,
                )

            masteryData.push({
                CompletionData: completionData,
                ...(gameVersion === "h1"
                    ? {
                          Data: {
                              normal: {
                                  CompletionData: completionData,
                              },
                              pro1: {
                                  CompletionData:
                                      controller.masteryService.getLocationCompletion(
                                          parent,
                                          parent,
                                          gameVersion,
                                          userId,
                                          parent.includes("SNUG")
                                              ? "evergreen"
                                              : "mission",
                                          "pro1",
                                      ),
                              },
                          },
                      }
                    : {}),
                Id: locations.parents[parent].Id,
                Image: locations.parents[parent].Properties.Icon,
                IsLocked: locations.parents[parent].Properties.IsLocked,
                Location: locations.parents[parent],
                RequiredResources:
                    locations.parents[parent].Properties.RequiredResources,
            })
        }
    }

    for (const child in locations.children) {
        if (
            child === "LOCATION_ICA_FACILITY_ARRIVAL" ||
            child.includes("SNUG_")
        ) {
            continue
        }

        const parent = locations.children[child].Properties.ParentLocation
        const location = locations.children[child]
        const challenges = controller.challengeService.getChallengesForLocation(
            child,
            gameVersion,
        )
        const challengeCompletion =
            controller.challengeService.countTotalNCompletedChallenges(
                challenges,
                userId,
                gameVersion,
            )

        career[parent!]?.Children.push(
            generateCareerEntryChild(
                location,
                challengeCompletion,
                child,
                generateCompletionData(child, userId, gameVersion),
            ),
        )
    }

    return {
        ServerTile: {
            title: "The Peacock Project",
            image: "images/contracts/novikov_and_magolis/tile.jpg",
            icon: "story",
            url: "",
            select: {
                header: "Playing on a Peacock instance",
                title: "The Peacock Project",
                icon: "story",
            },
        },
        DashboardData: [],
        DestinationsData: getAllGameDestinations(gameVersion, userId),
        CreateContractTutorial: generateUserCentric(
            contractCreationTutorial,
            userId,
            gameVersion,
        ),
        LocationsData: createLocationsData(gameVersion, true),
        ProfileData: {
            ChallengeData: {
                Children: Object.values(career),
            },
            MasteryData: masteryData,
        },
        StoryData: makeCampaigns(gameVersion, userId),
        FilterData: getVersionedConfig("FilterData", gameVersion, false),
        StoreData: getVersionedConfig("StoreData", gameVersion, false),
        IOIAccountStatus: {
            IsConfirmed: true,
            LinkedEmail: "mail@example.com",
            IOIAccountId: "00000000-0000-0000-0000-000000000000",
            IOIAccountBaseUrl: "https://account.ioi.dk",
        },
        FinishedFinalTest: true,
        Currency: {
            Balance: 0,
        },
        PlayerProfileXpData: {
            XP: userdata.Extensions.progression.PlayerProfileXP.Total,
            Level: userdata.Extensions.progression.PlayerProfileXP.ProfileLevel,
            MaxLevel: getMaxProfileLevel(gameVersion),
        },
    }
}
