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

import { Router } from "express"
import { RequestWithJwt } from "../types/types"
import { getConfig } from "../configSwizzleManager"
import { controller } from "../controller"
import { getParentLocationByName } from "../contracts/dataGen"

const legacyMenuDataRouter = Router()

legacyMenuDataRouter.get(
    "/MasteryLocation",
    // @ts-expect-error Has jwt props.
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
