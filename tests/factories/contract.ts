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

import { Factory } from "fishery"
import { MissionManifest } from "../../components/types/types"
import { pad, sequentialUuid } from "../helpers/testHelpers.js"

type ContractTransientParams = {
    /** Whether the contract should look like one made in Contracts Mode. */
    usercreated: boolean
}

class ContractFactory extends Factory<
    MissionManifest,
    ContractTransientParams
> {
    usercreated() {
        return this.transient({ usercreated: true })
    }
}

export const contractFactory = ContractFactory.define(
    ({ sequence, transientParams }) => {
        const contract: MissionManifest = {
            Data: {
                Objectives: [],
                Bricks: [],
            },
            Metadata: {
                Id: sequentialUuid(sequence),
                Title: `Amazing contract ${sequence}`,
                Description: `Amazing contract ${sequence}`,
                Location: "LOCATION_PARENT_PARIS",
                Type: "mission",
                ScenePath:
                    "assembly:/_pro/scenes/missions/paris/_scene_fashionshowhit_01.entity",
                Entitlements: [],
            },
        }

        if (transientParams.usercreated) {
            contract.Metadata.Type = "usercreated"
            contract.Metadata.PublicId = `1-01-${pad(sequence, 7)}-${pad(sequence, 2)}`
        }

        return contract
    },
)
