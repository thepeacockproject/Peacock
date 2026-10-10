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

import { describe, expect } from "vitest"
import { Controller } from "../../components/controller"
import {
    createControllerInstance,
    testWithFakeFs,
} from "../helpers/testHelpers"
import { loadConfig } from "../mocks/configSwizzleManager"
import { userProfileFactory } from "../factories/userProfile"
import type { GameVersion } from "../../components/types/types"

const controller: Controller = await createControllerInstance()

for (const config of ["LegacyLocationsData", "H2LocationsData"]) {
    loadConfig(config)
}

const SHOWSTOPPER = "00000000-0000-0000-0000-000000000200"

async function challengesFor(contractId: string, gameVersion: GameVersion) {
    const profile = await userProfileFactory.forVersion(gameVersion).create()

    return controller.challengeService.getChallengesForContract(
        contractId,
        gameVersion,
        profile.Id,
    )
}

describe("getChallengesForContract", () => {
    describe("H2016 location-wide challenges (issue #688)", () => {
        const SHOWSTOPPER_H1_PRO1 = "5ee4d771-6ab3-41fa-ab4f-04970d0ca327"

        // "Careful What You Wish For" (toss a coin in the fountain) - h2016, location wide, lacks type & inclusion data
        const FOUNTAIN_COIN = "00000200-0000-0000-0000-000000000026"

        testWithFakeFs(
            "includes untyped location-wide challenges in The Showstopper",
            async () => {
                const groups = await challengesFor(SHOWSTOPPER, "h1")

                expect(groups.discovery).toHaveLength(34)
                expect(groups.discovery.map((c) => c.Id)).toContain(
                    FOUNTAIN_COIN,
                )
            },
        )

        testWithFakeFs(
            "includes location-wide challenge packs in The Showstopper",
            async () => {
                const groups = await challengesFor(SHOWSTOPPER, "h1")

                expect(groups["vampire-pack"]).toHaveLength(8)
            },
        )

        testWithFakeFs(
            "still respects the pro1 filter for untyped challenges",
            async () => {
                const groups = await challengesFor(SHOWSTOPPER_H1_PRO1, "h1")

                expect(groups.discovery).toBeUndefined()
                expect(groups["vampire-pack"]).toBeUndefined()
            },
        )
    })

    describe("explicitly typed challenges are unaffected", () => {
        testWithFakeFs("H2 Showstopper", async () => {
            const groups = await challengesFor(SHOWSTOPPER, "h2")

            expect(groups.discovery).toHaveLength(21)
            expect(groups["vampire-pack"]).toHaveLength(8)
        })

        testWithFakeFs("H3 Showstopper", async () => {
            const groups = await challengesFor(SHOWSTOPPER, "h3")

            expect(groups.discovery).toHaveLength(19)
        })
    })
})
