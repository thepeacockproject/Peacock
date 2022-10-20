/*
 *     The Peacock Project - a HITMAN server replacement.
 *     Copyright (C) 2021-2022 The Peacock Project Team
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
import { packContractsAndChallenges } from "./buildTasks.mjs"
import { createRequire } from "module"

// this `require` instance will be hijacked by `esbuild-register` so we can load
// TS files as if they were JS in a CommonJS environment
const require = createRequire(import.meta.url)

await packContractsAndChallenges()

const { version, revisionIdent } = require("../package.json")

global.PEACOCK_DEV = true
global.HUMAN_VERSION = version
global.REV_IDENT = revisionIdent

process.env.DEBUG = "peacock"

// now we launch the server

console.log(
    `${picocolors.greenBright(
        ">>> PeacockDev",
    )} Spawning development server in ${process.cwd()}.`,
)

const { register } = require("esbuild-register/dist/node")

register()

require("../components/index.ts")
