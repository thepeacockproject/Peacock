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

import { factory } from "@rdil/factorygirl"
import { MissionManifest } from "../../components/types/types"

type ContractFactoryTraits = "usercreated"

function pad(n: number, places: number) {
    return n.toString(10).padStart(places, "0")
}

export const contractFactory = factory<MissionManifest, ContractFactoryTraits>(
    (utils) => ({
        Data: {
            Objectives: [],
            Bricks: [],
        },
        Metadata: {
            Id: utils.sequentialUuid("id"),
            Title: `Amazing contract ${utils.sequentialValue("title")}`,
            Description: `Amazing contract ${utils.sequentialValue("description")}`,
            Location: "LOCATION_PARENT_PARIS",
            Type: "mission",
            ScenePath:
                "assembly:/_pro/scenes/missions/paris/_scene_fashionshowhit_01.entity",
            Entitlements: [],
        },
    }),
    ({ trait }) => {
        trait("usercreated", (_, { sequentialValue }) => ({
            Metadata: {
                Type: "usercreated",
                PublicId: `1-01-${pad(sequentialValue("publicId"), 7)}-${pad(sequentialValue("publicId-end"), 2)}}`,
            } as never,
        }))
    },
)
