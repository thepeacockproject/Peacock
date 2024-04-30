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

// load as soon as possible to prevent dependency issues
import "./generatedPeacockRequireTable"

// load flags as soon as possible
import { getFlag, loadFlags } from "./flags"

loadFlags()

import { program } from "commander"
import { toolsMenu } from "./tools"
import { readFileSync, writeFileSync } from "fs"
import { pack, unpack } from "msgpackr"
import { log, LogLevel } from "./loggingInterop"
import { startServer } from "./index"
import { PEACOCKVERSTRING } from "./utils"
import * as process from "node:process"

program.description(
    "The Peacock Project is a HITMAN™ World of Assassination Trilogy server replacement.",
)

program.option("-v, --version", "print the version number and exit")
program.option(
    "--hmr",
    "enable experimental hot reloading of contracts",
    getFlag("experimentalHMR") as boolean,
)
program.option(
    "--plugin-dev-host",
    "activate plugin development features - requires plugin dev workspace setup",
    getFlag("developmentPluginDevHost") as boolean,
)
program.action(
    (options: { hmr: boolean; pluginDevHost: boolean; version: boolean }) => {
        if (options.version) {
            console.log(`Peacock ${PEACOCKVERSTRING}`)
            return process.exit()
        }

        return startServer(options)
    },
)

program.command("tools").description("open the tools UI").action(toolsMenu)

// noinspection RequiredAttributes
program
    .command("pack")
    .argument("<input>", "input file to pack")
    .option("-o, --output <path>", "where to output the packed file to", "")
    .description("packs an input file into a Challenge Resource Package")
    .action((input, options: { output: string }) => {
        const outputPath =
            options.output || input.replace(/\.[^/\\.]+$/, ".crp")

        writeFileSync(
            outputPath,
            pack(JSON.parse(readFileSync(input).toString())),
        )

        log(LogLevel.INFO, `Packed "${input}" to "${outputPath}" successfully.`)
    })

// noinspection RequiredAttributes
program
    .command("unpack")
    .argument("<input>", "input file to unpack")
    .option("-o, --output <path>", "where to output the unpacked file to", "")
    .description("unpacks a Challenge Resource Package")
    .action((input, options: { output: string }) => {
        const outputPath =
            options.output || input.replace(/\.[^/\\.]+$/, ".json")

        writeFileSync(outputPath, JSON.stringify(unpack(readFileSync(input))))

        log(
            LogLevel.INFO,
            `Unpacked "${input}" to "${outputPath}" successfully.`,
        )
    })

program.parse(process.argv)
