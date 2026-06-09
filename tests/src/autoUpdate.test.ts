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

import { afterAll, describe, expect, it } from "vitest"
import {
    ASSET_NAME_PATTERN,
    getPlatformAssetName,
} from "../../components/autoUpdate"

describe("getPlatformAssetName", () => {
    const originalPlatform = process.platform

    afterAll(() => {
        Object.defineProperty(process, "platform", {
            value: originalPlatform,
        })
    })

    function mockPlatform(platform: NodeJS.Platform) {
        Object.defineProperty(process, "platform", {
            value: platform,
            configurable: true,
        })
    }

    it("returns the Windows asset name", () => {
        mockPlatform("win32")
        expect(getPlatformAssetName("8.8.1")).toBe("Peacock-v8.8.1.zip")
    })

    it("returns the Linux asset name", () => {
        mockPlatform("linux")
        expect(getPlatformAssetName("8.8.1")).toBe("Peacock-v8.8.1-linux.zip")
    })

    it("returns the macOS asset name", () => {
        mockPlatform("darwin")
        expect(getPlatformAssetName("8.8.1")).toBe("Peacock-v8.8.1-macos.zip")
    })

    it("returns null for unsupported platforms", () => {
        mockPlatform("aix" as NodeJS.Platform)
        expect(getPlatformAssetName("8.8.1")).toBeNull()
    })
})

describe("ASSET_NAME_PATTERN", () => {
    it("matches Windows asset names", () => {
        expect(ASSET_NAME_PATTERN.test("Peacock-v8.8.1.zip")).toBe(true)
        expect(ASSET_NAME_PATTERN.test("Peacock-v10.0.0.zip")).toBe(true)
    })

    it("matches Linux asset names", () => {
        expect(ASSET_NAME_PATTERN.test("Peacock-v8.8.1-linux.zip")).toBe(true)
    })

    it("matches macOS asset names", () => {
        expect(ASSET_NAME_PATTERN.test("Peacock-v8.8.1-macos.zip")).toBe(true)
    })

    it("rejects invalid asset names", () => {
        expect(ASSET_NAME_PATTERN.test("Peacock-v8.8.1.2.zip")).toBe(false)
        expect(ASSET_NAME_PATTERN.test("Peacock-v8.8.zip")).toBe(false)
        expect(ASSET_NAME_PATTERN.test("Peacock-v8.8.1.exe")).toBe(false)
        expect(ASSET_NAME_PATTERN.test("; rm -rf /")).toBe(false)
        expect(ASSET_NAME_PATTERN.test("")).toBe(false)
    })
})
