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

import { describe, expect, test } from "vitest"
import * as cc from "../../components/statemachines/contractCreation"
import { ContractCreationNpcTargetPayload } from "../../components/statemachines/contractCreation"
import { nilUuid } from "../../components/utils"
// @ts-expect-error No JSON imports allowed - TS language server will choke on trying to resolve JSON
// imports from the config manager, some of which are megabytes large, a nightmare for performance.
import killCases from "../testData/contractCreationCases.json"

/** dummy data for basic operations that require no special cases, or as a base to build data with */
const partialObjData: ContractCreationNpcTargetPayload = {
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
}

describe("state machines", () => {
    test("can use createTargetKillObjective", () => {
        const objective = cc.createTargetKillObjective(partialObjData)

        objective.Id = nilUuid

        expect(objective).toMatchSnapshot()
    })

    describe("outfits", () => {
        test.each([
            ["e4d6dcb4-6c2c-44f5-98a6-b41ec1d92dee", +true, +true],
            ["a2deb86a-f38c-47d3-af98-848ea22500d6", +true, +false],
            ["b47eff05-6e65-4b27-860d-b114077e084c", +false, +true],
            ["f1f7850d-9292-4cfc-b66e-e5661ef4a142", +false, +false],
        ])(
            "can create an outfit state machine - id: %s, is suit: %i, is required: %i",
            (id, isSuit, isRequired) => {
                const objective = cc.createRequiredOutfitObjective({
                    ...partialObjData,
                    Outfit: {
                        RepositoryId: id,
                        IsHitmanSuit: Boolean(isSuit),
                        Required: Boolean(isRequired),
                    },
                })

                objective.Id = nilUuid
                expect(objective).toMatchSnapshot()
            },
        )
    })
})

describe("real world input data with createObjectivesForTarget", () => {
    test.each(killCases)(
        "kill conditions: $name",
        // @ts-expect-error TS doesn't wanna narrow this
        (options: {
            name: string
            params: ContractCreationNpcTargetPayload
        }) => {
            const objectives = cc.createObjectivesForTarget(options.params, {
                // because we are comparing against snapshots, we intentionally use custom IDs for each of the generated objectives
                base: "094a2f76-e0b4-4ab6-bf54-b5bdfdd8a0c6",
                kill: "3df3bec8-17e6-4007-b1ac-5bd14485209a",
                outfit: "59bfbf74-c38f-4cd4-bcd7-d0c44cd0940c",
            })

            expect(objectives).toMatchSnapshot()
        },
    )
})

describe("time limits", () => {
    test.each([
        [91, +true],
        [91, +false],
        [346, +false],
        [346, +true],
    ])(
        "can create a time limit - seconds: %i, optional: %i",
        (time, optional) => {
            expect(
                cc.createTimeLimit(time, Boolean(optional)),
            ).toMatchSnapshot()
        },
    )
})
