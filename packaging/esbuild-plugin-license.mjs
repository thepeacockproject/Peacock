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

import rollupPluginLicense from "rollup-plugin-license"

/**
 * Plugin that emits the third party notices file, taken from the Prettier source code.
 *
 * @see https://github.com/prettier/prettier/blob/aa1d536e29a55e4647452e87c2fa61c2b8c7d92d/scripts/build/esbuild-plugins/license.mjs
 */
export function esbuildPluginLicense(options) {
    const plugin = rollupPluginLicense(options)

    return {
        name: "license",

        setup(build) {
            build.initialOptions.metafile = true

            build.onEnd((result) => {
                if (result.errors.length > 0) {
                    return
                }

                const files = Object.keys(result.metafile.inputs)
                const chunk = {
                    modules: Object.fromEntries(
                        files.map((file) => [file, { renderedLength: 1 }]),
                    ),
                }
                plugin.renderChunk("", chunk)
                plugin.generateBundle()
            })
        },
    }
}
