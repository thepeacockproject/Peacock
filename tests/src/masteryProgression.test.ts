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

import { afterEach, describe, expect } from "vitest"
import { Controller } from "../../components/controller"
import {
    createControllerInstance,
    testWithFakeFs,
} from "../helpers/testHelpers"
import { loadConfig } from "../mocks/configSwizzleManager"
import { contractSessionFactory } from "../factories/contractSession"
import { userProfileFactory } from "../factories/userProfile"
import type { UserProfile } from "../../components/types/types"

const controller: Controller = await createControllerInstance()

for (const config of [
    "Legacyallunlockables",
    "LegacyLocationsData",
    "SniperUnlockables",
    "VersusUnlockables",
]) {
    loadConfig(config)
}

afterEach(() => {
    controller.inventoryService.clearInventoryCache()
})

describe("H2016 mastery drops granted mid-session", () => {
    const PARIS_PARENT = "LOCATION_PARENT_PARIS"
    const SHOWSTOPPER_H1 = "00000000-0000-0000-0000-000000000200"
    const SHOWSTOPPER_H1_PRO1 = "5ee4d771-6ab3-41fa-ab4f-04970d0ca327"

    // level 2 drops for each H2016 Paris difficulty sub-package
    const KITCHEN_NORMAL = "STARTING_LOCATION_PARIS_PEACOCK_BASEMENT_KITCHEN"
    const KITCHEN_PRO1 = "PRO1_STARTING_LOCATION_PARIS_PEACOCK_BASEMENT_KITCHEN"
    // level 3 drop for the normal sub-package
    const BARGE_NORMAL = "AGENCYPICKUP_PARIS_BARGE"

    function inventoryIds(profile: UserProfile): Set<string> {
        return new Set(
            controller.inventoryService
                .createInventory(profile.Id, "h1")
                .map((item) => item.Unlockable.Id),
        )
    }

    function parisLevel(profile: UserProfile, difficulty: string): number {
        return controller.progressionService.getMasteryProgressionForLocation(
            profile,
            PARIS_PARENT,
            difficulty,
        )!.Level
    }

    testWithFakeFs(
        "unlocks the level 2 normal drop without rebuilding the inventory",
        async () => {
            const profile = await userProfileFactory.forVersion("h1").create()
            const session = contractSessionFactory.build({
                gameVersion: "h1",
                contractId: SHOWSTOPPER_H1,
                userId: profile.Id,
            })

            const before = inventoryIds(profile)
            expect(before.has(KITCHEN_NORMAL)).toBe(false)
            expect(parisLevel(profile, "normal")).toBe(1)

            controller.progressionService.grantProfileProgression(
                0,
                6000,
                [],
                session,
                profile,
                PARIS_PARENT,
            )

            expect(parisLevel(profile, "normal")).toBe(2)
            expect(parisLevel(profile, "pro1")).toBe(1)

            const after = inventoryIds(profile)
            expect(after.has(KITCHEN_NORMAL)).toBe(true)
            expect(after.has(BARGE_NORMAL)).toBe(false)
            expect(after.has(KITCHEN_PRO1)).toBe(false)
        },
    )

    testWithFakeFs(
        "matches what a cold inventory rebuild would produce",
        async () => {
            const profile = await userProfileFactory.forVersion("h1").create()
            const session = contractSessionFactory.build({
                gameVersion: "h1",
                contractId: SHOWSTOPPER_H1,
                userId: profile.Id,
            })

            inventoryIds(profile)

            controller.progressionService.grantProfileProgression(
                0,
                6000,
                [],
                session,
                profile,
                PARIS_PARENT,
            )

            const granted = inventoryIds(profile)

            controller.inventoryService.clearInventoryFor(profile.Id)
            const rebuilt = inventoryIds(profile)

            expect(granted).toEqual(rebuilt)
        },
    )

    testWithFakeFs(
        "unlocks the professional difficulty drop, not the normal one",
        async () => {
            const profile = await userProfileFactory.forVersion("h1").create()
            const session = contractSessionFactory.build({
                gameVersion: "h1",
                contractId: SHOWSTOPPER_H1_PRO1,
                userId: profile.Id,
            })

            inventoryIds(profile)

            controller.progressionService.grantProfileProgression(
                0,
                10000,
                [],
                session,
                profile,
                PARIS_PARENT,
            )

            expect(parisLevel(profile, "pro1")).toBe(2)
            expect(parisLevel(profile, "normal")).toBe(1)

            const after = inventoryIds(profile)
            expect(after.has(KITCHEN_PRO1)).toBe(true)
            expect(after.has(KITCHEN_NORMAL)).toBe(false)
        },
    )
})
