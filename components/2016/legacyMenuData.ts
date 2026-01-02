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

import { Router } from "express"
import {
    type ChallengeCategoryCompletion,
    ChallengeCompletion,
    CompletionData,
    type PeacockLocationsData,
    RequestWithJwt,
    Unlockable,
} from "../types/types"
import { getConfig, getVersionedConfig } from "../configSwizzleManager"
import { controller } from "../controller"
import {
    generateCompletionData,
    getParentLocationByName,
} from "../contracts/dataGen"
import { ChallengeFilterType, Pro1FilterType } from "../candle/challengeHelpers"

const legacyMenuDataRouter = Router()

legacyMenuDataRouter.get(
    "/MasteryLocation",
    // @ts-expect-error Has jwt props.
    (req: RequestWithJwt<{ locationId: string; difficulty: string }>, res) => {
        const location = getParentLocationByName(
            req.query.locationId,
            req.gameVersion,
        )

        res.json({
            template: getConfig("LegacyMasteryLocationTemplate", false),
            data: {
                DifficultyLevelData: [
                    {
                        Name: "normal",
                        Data: {
                            LocationId: req.query.locationId,
                            ...controller.masteryService.getMasteryDataForDestination(
                                req.query.locationId,
                                req.gameVersion,
                                req.jwt.unique_name,
                                "normal",
                            )[0],
                        },
                        Available: true,
                    },
                    {
                        Name: "pro1",
                        Data: {
                            LocationId: req.query.locationId,
                            ...controller.masteryService.getMasteryDataForDestination(
                                req.query.locationId,
                                req.gameVersion,
                                req.jwt.unique_name,
                                "pro1",
                            )[0],
                        },
                        Available: true,
                    },
                ],
                LocationId: req.query.locationId,
                Location: location,
            },
        })
    },
)

type StatisticsData = {
    DifficultyLevelData: {
        Name: "normal" | "pro1"
        SubLocationData: {
            ParentLocation: Unlockable
            Location: Unlockable
            CompletionData: CompletionData
            ChallengeCategoryCompletion: ChallengeCategoryCompletion[]
            ChallengeCompletion: ChallengeCompletion
        }[]
    }[]
}

legacyMenuDataRouter.get(
    "/Statistics",
    // @ts-expect-error Has jwt props.
    (req: RequestWithJwt, res) => {
        const data: StatisticsData = {
            DifficultyLevelData: [
                {
                    Name: "normal",
                    SubLocationData: [],
                },
                {
                    Name: "pro1",
                    SubLocationData: [],
                },
            ],
        }

        // This is essentially a rewrite of getPlayerProfileData except without
        // the player profile data
        const locationData = getVersionedConfig<PeacockLocationsData>(
            "LocationsData",
            req.gameVersion,
            false,
        )

        // Contains the parent ids of ones that have had their pro1 data
        // added. It's a hacky workaround.
        const processedParents: string[] = []

        for (const subLocation of Object.values(locationData.children)) {
            const parentLocation =
                locationData.parents[
                    subLocation.Properties.ParentLocation || ""
                ]

            const normalChallenges =
                controller.challengeService.getGroupedChallengeLists(
                    {
                        type: ChallengeFilterType.ParentLocation,
                        parent: parentLocation.Id,
                        gameVersion: req.gameVersion,
                        pro1Filter: Pro1FilterType.Exclude,
                    },
                    parentLocation.Id,
                    req.gameVersion,
                )

            const normalCompletion: ChallengeCategoryCompletion[] = []

            for (const challengeGroup in normalChallenges) {
                const challengeCompletion =
                    controller.challengeService.countTotalNCompletedChallenges(
                        {
                            challengeGroup: normalChallenges[challengeGroup],
                        },
                        req.jwt.unique_name,
                        req.gameVersion,
                    )

                normalCompletion.push({
                    Name: normalChallenges[challengeGroup][0].CategoryName,
                    ...challengeCompletion,
                })
            }

            data.DifficultyLevelData[0].SubLocationData.push({
                ParentLocation: parentLocation,
                Location: subLocation,
                ChallengeCategoryCompletion: normalCompletion,
                CompletionData: {
                    ...generateCompletionData(
                        subLocation.Id,
                        req.jwt.unique_name,
                        req.gameVersion,
                        "mission",
                        "normal",
                    ),
                    HideProgression:
                        subLocation.Properties.ProgressionKey !==
                            subLocation.Id ||
                        parentLocation.Id === "LOCATION_PARENT_ICA_FACILITY",
                },
                ChallengeCompletion:
                    controller.challengeService.countTotalNCompletedChallenges(
                        normalChallenges,
                        req.jwt.unique_name,
                        req.gameVersion,
                        100,
                    ),
            })

            if (
                parentLocation.Id === "LOCATION_PARENT_ICA_FACILITY" ||
                processedParents.includes(parentLocation.Id)
            )
                continue

            processedParents.push(parentLocation.Id)

            const pro1Challenges =
                controller.challengeService.getGroupedChallengeLists(
                    {
                        type: ChallengeFilterType.ParentLocation,
                        parent: parentLocation.Id,
                        gameVersion: req.gameVersion,
                        pro1Filter: Pro1FilterType.Only,
                    },
                    parentLocation.Id,
                    req.gameVersion,
                )

            const pro1Completion: ChallengeCategoryCompletion[] = []

            for (const challengeGroup in pro1Challenges) {
                const challengeCompletion =
                    controller.challengeService.countTotalNCompletedChallenges(
                        {
                            challengeGroup: pro1Challenges[challengeGroup],
                        },
                        req.jwt.unique_name,
                        req.gameVersion,
                    )

                pro1Completion.push({
                    Name: pro1Challenges[challengeGroup][0].CategoryName,
                    ...challengeCompletion,
                })
            }

            data.DifficultyLevelData[1].SubLocationData.push({
                ParentLocation: parentLocation,
                Location: subLocation,
                ChallengeCategoryCompletion: pro1Completion,
                CompletionData: generateCompletionData(
                    subLocation.Id,
                    req.jwt.unique_name,
                    req.gameVersion,
                    "mission",
                    "pro1",
                ),
                ChallengeCompletion:
                    controller.challengeService.countTotalNCompletedChallenges(
                        pro1Challenges,
                        req.jwt.unique_name,
                        req.gameVersion,
                        100,
                    ),
            })
        }

        res.json({
            template: getConfig("LegacyStatisticsTemplate", false),
            data,
        })
    },
)

export { legacyMenuDataRouter }
