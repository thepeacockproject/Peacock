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

import path from "path"
import { defineConfig } from "vitest/config"
import { Plugin } from "vite"

function dontLoadJsonPlugin() {
    const pluginName = "dontLoadJsonPlugin"
    const resolvedIdPrefix = `\0${pluginName}:`
    const jsonRegexResolve = /\.json$/
    const jsonRegexLoad = /\.json.ignore$/
    const ignoreExtension = ".ignore"

    return <Plugin>{
        name: pluginName,
        enforce: "pre",
        resolveId(id: string, importer: string) {
            if (id.startsWith("\0") || !jsonRegexResolve.test(id)) {
                return null
            }

            // trying to resolve test-exclusive data, which can safely be resolved normally
            if (id.includes("/testData/")) {
                return null
            }

            const filePath = path.join(path.dirname(importer), id)

            return `${resolvedIdPrefix}${filePath}${ignoreExtension}`
        },
        load(id: string) {
            if (!id.startsWith(resolvedIdPrefix) || !jsonRegexLoad.test(id)) {
                return null
            }

            return `export default "\\"${id.substring(
                resolvedIdPrefix.length,
                id.length - ignoreExtension.length,
            )}\\""`
        },
    }
}

export default defineConfig({
    test: {
        globals: true,
        setupFiles: ["setup/globalDefines.ts"],
    },
    plugins: [dontLoadJsonPlugin()],
})
