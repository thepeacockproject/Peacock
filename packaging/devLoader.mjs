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

import picocolors from "picocolors"
import { generateRequireTable, packResources } from "./buildTasks.mjs"
import { createRequire, Module } from "module"
import { readFileSync } from "fs"

// this `require` instance will be hijacked by `esbuild-register` so we can load
// TS files as if they were JS in a CommonJS environment
const require = createRequire(import.meta.url)

await generateRequireTable()
await packResources()

const { version } = require("../package.json")

global.PEACOCK_DEV = true
global.HUMAN_VERSION = version

process.env.DEBUG = "peacock"
process.env.LOG_MAX_FILES = ""

// now we launch the server

console.log(
    `${picocolors.greenBright(
        ">>> PeacockDev",
    )} Spawning development server in ${process.cwd()}.`,
)

const { register } = require("esbuild-register/dist/node")

register()

const resolveTextFile = function (module, path) {
    module.exports = readFileSync(path).toString()
}

Module._extensions[".json"] = resolveTextFile

require("../components/cli.ts")
