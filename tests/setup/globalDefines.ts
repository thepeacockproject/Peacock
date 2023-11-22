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

import { readFileSync } from "fs"
import path from "path"

Object.assign(globalThis, {
    PEACOCK_DEV: false,
    HUMAN_VERSION: "test",
    REV_IDENT: 1,
})

process.env.TEST = "peacock"
process.env.LOG_LEVEL_FILE = "none"

const configManager = await import("../../components/configManager.ts")

const fakeRequireCache: Record<string, unknown> = {}

function loadConfig(configPath: string) {
    if (fakeRequireCache[configPath]) {
        return fakeRequireCache[configPath]
    }

    const contents = readFileSync(
        path.join(process.cwd(), "../", configPath),
        "utf-8",
    )
    fakeRequireCache[configPath] = JSON.parse(contents)
    return fakeRequireCache[configPath]
}

// @ts-expect-error This version of require doesn't need to implement real require things.
configManager.configManager._require = loadConfig

export {}
