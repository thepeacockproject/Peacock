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

import { afterEach, describe, expect, test, vi } from "vitest"
import {
    createTargetKillObjective,
    createTimeLimit,
} from "../../components/statemachines/contractCreation"
import { nilUuid } from "../../components/utils"

afterEach(() => {
    vi.restoreAllMocks()
})

describe("state machines", () => {
    test("can use createTargetKillObjective", () => {
        expect(
            createTargetKillObjective({
                RepositoryId: "b69187a0-0860-403f-9616-981127fef877",
                Selected: true,
                Weapon: {
                    RepositoryId: nilUuid,
                    RequiredKillMethod: "",
                    RequiredKillMethodType: 0,
                    KillMethodStrict: "",
                    KillMethodBroad: "",
                },
                Outfit: {
                    Required: false,
                    RepositoryId: "48a7f8a4-37ae-4522-a8b0-db746d970a7f",
                    IsHitmanSuit: true,
                },
            }),
        ).toMatchSnapshot()
    })
})

describe.todo("kill conditions")

describe("time limits", () => {
    test("can create an optional time limit", () => {
        expect(createTimeLimit(91, true)).toMatchSnapshot()
    })

    test("can create a mandatory time limit", () => {
        expect(createTimeLimit(346, false)).toMatchSnapshot()
    })
})
