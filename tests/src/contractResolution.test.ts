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

import { afterEach, describe, expect, it, vi } from "vitest"
import { Controller } from "../../components/controller"
import {
    createControllerInstance,
    testWithFakeFs,
} from "../helpers/testHelpers"
import { contractFactory } from "../factories/contract"

const controller: Controller = await createControllerInstance()

describe("internal contracts", () => {
    it("can resolve The Showstopper", () => {
        expect(
            controller.resolveContract(
                "00000000-0000-0000-0000-000000000200",
                "h3",
            )!.Metadata.Title,
        ).toBe("UI_CONTRACT_PEACOCK_TITLE")
    })

    it("does not resolve a fake contract", () => {
        expect(controller.resolveContract("fake!", "h3")).toBeUndefined()
    })
})

describe("getContractManifest hook", () => {
    afterEach(() => controller.hooks.getContractManifest.resetTaps())

    it("overrides the contract manifest", () => {
        const landslide = structuredClone(
            controller.resolveContract(
                "00000000-0000-0000-0001-000000000005",
                "h3",
            ),
        )
        expect(landslide).toBeDefined()
        landslide!.Metadata.Title = "Landslide"

        expect(
            controller.resolveContract(
                "00000000-0000-0000-0001-000000000005",
                "h3",
            )?.Metadata.Title,
        ).toBe("UI_CONTRACT_MAMBA_TITLE")

        controller.hooks.getContractManifest.tap("ExamplePlugin", (id) => {
            if (id === "00000000-0000-0000-0001-000000000005") {
                return landslide
            }
        })

        expect(
            controller.resolveContract(
                "00000000-0000-0000-0001-000000000005",
                "h3",
            )?.Metadata.Title,
        ).toBe("Landslide")
    })
})

describe("contracts folder", () => {
    testWithFakeFs(
        "can resolve a contract from the contracts folder",
        async ({ fakeFs, expect }) => {
            const contract = contractFactory({}, ["usercreated"])
            await fakeFs.writeFile(
                "contracts/test.json",
                JSON.stringify(contract),
            )

            const fastGlob = await import("fast-glob")
            vi.mocked(fastGlob.glob).mockImplementation(async () => {
                const values = await fakeFs.readdir("contracts")
                return values.map((v) => `contracts/${v}`)
            })

            await controller.index()

            expect(
                controller.resolveContract(contract.Metadata.Id, "h3"),
            ).toBeDefined()
        },
    )
})
