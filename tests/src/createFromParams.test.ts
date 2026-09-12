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

import { describe, expect, test } from "vitest"
import { createFromParamsBodySchema } from "../../components/types/gameSchemas"
import { nilUuid } from "../../components/utils"
import {
    RequiredKillMethodType
} from "../../components/statemachines/contractCreation.js"

/** a realistic payload, as the game sends it at the end of contract creation */
const validBody = {
    creationData: {
        Title: "UI_CONTRACTS_UGC_TITLE",
        Description: "UI_CONTRACTS_UGC_DESCRIPTION",
        ContractId: "e9f86bbc-ce66-4aa3-8759-2e0580178156",
        ContractPublicId: "113468897792",
        ContractConditionIds: ["1a596216-381e-4592-9798-26f156973942"],
        Targets: [
            {
                RepositoryId: "b69187a0-0860-403f-9616-981127fef877",
                Selected: true,
                Weapon: {
                    RepositoryId: "12cb6b51-a6dd-4bf5-9653-0ab727820cac",
                    KillMethodBroad: "melee_lethal",
                    KillMethodStrict: "",
                    RequiredKillMethod: "melee_lethal",
                    RequiredKillMethodType: 3 as RequiredKillMethodType,
                },
                Outfit: {
                    RepositoryId: "48a7f8a4-37ae-4522-a8b0-db746d970a7f",
                    Required: true,
                    IsHitmanSuit: true,
                },
            },
        ],
    },
}

const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o))

describe("CreateFromParams schema", () => {
    test("accepts a realistic payload", () => {
        expect(createFromParamsBodySchema.safeParse(validBody).success).toBe(
            true,
        )
    })

    test("accepts the nil UUID as a weapon, for accidents and neck snaps", () => {
        const body = clone(validBody)
        body.creationData.Targets[0].Weapon.RepositoryId = nilUuid
        body.creationData.Targets[0].Weapon.KillMethodBroad = "accident"
        body.creationData.Targets[0].Weapon.RequiredKillMethod =
            "accident_drown"
        body.creationData.Targets[0].Weapon.RequiredKillMethodType = 2

        expect(createFromParamsBodySchema.safeParse(body).success).toBe(true)
    })

    describe("rejects public IDs that are unsafe as filenames", () => {
        // the public ID becomes contracts/<id>.json on disk
        test.each([
            ["forward slash traversal", "../../package"],
            ["backslash traversal", "..\\..\\package"],
            ["traversal after a valid id", "113468897792/../../evil"],
            ["trailing junk", "113468897792evil"],
            ["leading junk", "evil113468897792"],
            ["too short", "06856262622"],
            ["empty", ""],
            ["not a string", 113468897792],
        ])("%s", (_name, publicId) => {
            const body = clone(validBody)
            // @ts-expect-error deliberately invalid input
            body.creationData.ContractPublicId = publicId

            expect(createFromParamsBodySchema.safeParse(body).success).toBe(
                false,
            )
        })
    })

    describe("rejects malformed bodies", () => {
        test("no creationData at all", () => {
            expect(createFromParamsBodySchema.safeParse({}).success).toBe(false)
        })

        test("targets that are not objects", () => {
            const body = clone(validBody)
            // @ts-expect-error deliberately invalid input
            body.creationData.Targets = [null]

            expect(createFromParamsBodySchema.safeParse(body).success).toBe(
                false,
            )
        })

        test("a target missing its weapon", () => {
            const body = clone(validBody)
            // @ts-expect-error deliberately invalid input
            delete body.creationData.Targets[0].Weapon

            expect(createFromParamsBodySchema.safeParse(body).success).toBe(
                false,
            )
        })

        test("a kill method granularity outside the four levels", () => {
            const body = clone(validBody)
            // @ts-expect-error deliberately invalid input
            body.creationData.Targets[0].Weapon.RequiredKillMethodType = 9

            expect(createFromParamsBodySchema.safeParse(body).success).toBe(
                false,
            )
        })

        test("a contract ID that is not a UUID", () => {
            const body = clone(validBody)
            body.creationData.ContractId = "not-a-uuid"

            expect(createFromParamsBodySchema.safeParse(body).success).toBe(
                false,
            )
        })
    })
})
