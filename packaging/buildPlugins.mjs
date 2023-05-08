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

import * as e from "esbuild"
import glob from "fast-glob"
import packageJson from "../package.json" assert { type: "json" }

const plugins = glob.sync("plugins/*.plugin.ts", {
    cwd: ".",
})

await e.build({
    entryPoints: plugins,
    bundle: true,
    outdir: "plugins",
    platform: "node",
    target: "es2021",
    external: [
        "@peacockproject/core",
        ...Object.keys(packageJson.dependencies),
    ],
})
