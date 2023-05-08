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

import { loadConfig } from "../mocks/configSwizzleManager"
import { ContractSession, RatingKill } from "../../components/types/types"
import { calculatePlaystyle } from "../../components/playStyles"

loadConfig("Playstyles")

describe("calculatePlaystyle", () => {
    test("default", () => {
        const contractSession = <ContractSession>{
            kills: new Set<RatingKill>(),
        }

        const result = calculatePlaystyle(contractSession)

        expect(result[0].Type).toBe("HEAD_SHOT_ASSASSIN")
    })

    test("pistol", () => {
        const ratingKill: RatingKill = <RatingKill>{
            KillClass: "ballistic",
            KillItemCategory: "pistol",
        }

        const contractSession = <ContractSession>{
            kills: new Set<RatingKill>([ratingKill]),
        }

        const result = calculatePlaystyle(contractSession)

        expect(result[0].Type).toBe("PISTOL_ASSASSIN")
    })
})
