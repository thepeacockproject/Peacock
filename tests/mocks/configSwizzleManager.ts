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

import * as configSwizzleManager from "../../components/configSwizzleManager"
import { readFileSync } from "fs"

const originalFilePaths: Record<string, string> = {}

Object.keys(configSwizzleManager.configs).forEach((config: string) => {
    originalFilePaths[config] = <string>configSwizzleManager.configs[config]

    configSwizzleManager.configs[config] = undefined
})

export function loadConfig(config: string) {
    if (!originalFilePaths[config]) {
        return
    }

    const contents = readFileSync(originalFilePaths[config], "utf-8")

    configSwizzleManager.configs[config] = JSON.parse(contents)
}

export function setConfig(config: string, data: unknown) {
    configSwizzleManager.configs[config] = data
}

const getConfigOriginal = configSwizzleManager.getConfig
vi.spyOn(configSwizzleManager, "getConfig").mockImplementation(
    (config: string, clone: boolean) => {
        if (!configSwizzleManager.configs[config]) {
            throw `Config '${config}' has not been loaded!`
        }

        return getConfigOriginal(config, clone)
    },
)
