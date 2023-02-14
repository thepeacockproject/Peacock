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

import type { RequestWithJwt } from "../types/types"
import type { Response } from "express"
import { getConfig, getVersionedConfig } from "../configSwizzleManager"
import { getUserData } from "../databaseHandler"
import { generateUserCentric } from "./dataGen"
import { controller } from "../controller"
import { createLocationsData } from "../menus/destinations"
import { contractCreationTutorialId } from "components/utils"

export function contractsModeHome(req: RequestWithJwt, res: Response): void {
    const contractsHomeTemplate = getConfig("ContractsTemplate", false)

    const userData = getUserData(req.jwt.unique_name, req.gameVersion)

    const contractCreationTutorial = controller.resolveContract(
        contractCreationTutorialId,
    )

    res.json({
        template: contractsHomeTemplate,
        data: {
            CreateContractTutorial: generateUserCentric(
                contractCreationTutorial!,
                req.jwt.unique_name,
                req.gameVersion,
            ),
            LocationsData: createLocationsData(req.gameVersion, true),
            FilterData: getVersionedConfig(
                "FilterData",
                req.gameVersion,
                false,
            ),
            PlayerProfileXpData: {
                XP: userData.Extensions.progression.PlayerProfileXP.Total,
                Level: userData.Extensions.progression.PlayerProfileXP
                    .ProfileLevel,
                MaxLevel: 7500,
            },
        },
    })
}
