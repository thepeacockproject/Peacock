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

import { getVersionedConfig } from "../configSwizzleManager"
import type {
    CompiledChallengeTreeCategory,
    PeacockLocationsData,
    StandardRequest,
    Unlockable,
} from "../types/types"
import { controller } from "../controller"

export type ChallengeLocationQuery = {
    locationId: string
}

type ChallengeLocationResponse = {
    template: unknown
    data: {
        Name: string
        Location: Unlockable
        Children: CompiledChallengeTreeCategory[]
    }
}

export function challengeLocation(
    req: StandardRequest<ChallengeLocationQuery>,
): ChallengeLocationResponse {
    const location = getVersionedConfig<PeacockLocationsData>(
        "LocationsData",
        req.gameVersion,
        true,
    ).children[req.query.locationId]

    return {
        template: getVersionedConfig(
            "ChallengeLocationTemplate",
            req.gameVersion,
            false,
        ),
        data: {
            Name: location.DisplayNameLocKey,
            Location: location,
            Children: controller.challengeService.getChallengeDataForLocation(
                req.query.locationId,
                req.gameVersion,
                req.jwt.unique_name,
            ),
        },
    }
}
