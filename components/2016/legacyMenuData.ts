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

import { Router } from "express"
import { RequestWithJwt } from "../types/types"
import { getConfig } from "../configSwizzleManager"
import { controller } from "../controller"
import { getParentLocationByName } from "../contracts/dataGen"

const legacyMenuDataRouter = Router()

legacyMenuDataRouter.get(
    "/debriefingchallenges",
    (
        req: RequestWithJwt<{ contractSessionId: string; contractId: string }>,
        res,
    ) => {
        if (typeof req.query.contractId !== "string") {
            res.status(400).send("invalid contractId")
            return
        }

        // debriefingchallenges?contractSessionId=00000000000000-00000000-0000-0000-0000-000000000001&contractId=dd906289-7c32-427f-b689-98ae645b407f
        res.json({
            template: getConfig("LegacyDebriefingChallengesTemplate", false),
            data: {
                ChallengeData: {
                    // FIXME: This may not work correctly; I don't know the actual format so I'm assuming challenge tree
                    Children:
                        controller.challengeService.getChallengeTreeForContract(
                            req.query.contractId,
                            req.gameVersion,
                            req.jwt.unique_name,
                        ),
                },
            },
        })
    },
)

legacyMenuDataRouter.get(
    "/MasteryLocation",
    (req: RequestWithJwt<{ locationId: string; difficulty: string }>, res) => {
        const masteryData =
            controller.masteryService.getMasteryDataForDestination(
                req.query.locationId,
                req.gameVersion,
                req.jwt.unique_name,
            )

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
                            ...masteryData[0],
                        },
                        Available: true,
                    },
                    {
                        Name: "pro1",
                        Data: {
                            LocationId: req.query.locationId,
                            ...masteryData[1],
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

export { legacyMenuDataRouter }
