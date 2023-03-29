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

import prompts from "prompts"
import { log, LogLevel } from "./loggingInterop"
import { readdir, writeFile } from "fs/promises"
import { PEACOCKVER, PEACOCKVERSTRING } from "./utils"
import { getSwizzleable } from "./configSwizzleManager"
import md5File from "md5-file"
import { arch, cpus as cpuList, platform, version } from "os"
import { Controller, isPlugin } from "./controller"
import { getAllFlags } from "./flags"
import axios from "axios"
import { Stream } from "stream"
import { createWriteStream, existsSync, mkdirSync } from "fs"
import ProgressBar from "progress"
import { resolve as pathResolve } from "path"
import picocolors from "picocolors"
import { Filename, PortablePath, ppath, xfs } from "@yarnpkg/fslib"
import { ZipFS } from "@yarnpkg/libzip"

// NOTE: make sure to update ALL 3 OF THESE VALUES, or things will break!!
const IMAGE_PACK_BIN =
    "https://codeload.github.com/thepeacockproject/ImagePack/zip/b8415da0be992d6a2e7d10cb5d3ccd9aea4f9296"
/**
 * Size of the image pack zip in bytes.
 */
const IMAGE_PACK_LEN = 117286836
const IMAGE_PACK_BASE_DIR = "ImagePack-b8415da0be992d6a2e7d10cb5d3ccd9aea4f9296"

export async function toolsMenu() {
    const init = await prompts({
        name: "actions",
        message: "Select actions:",
        type: "select",
        choices: [
            {
                title: "Export debug info",
                description: "Export helpful information for the developers.",
                value: "debug",
            },
            {
                title: "Download contract from IOI servers",
                description: "Download a contract from IOI's servers.",
                value: "download-contract",
            },
            {
                title: "Download all assets for offline use",
                description:
                    "Downloads all the files you need to use Peacock fully offline.",
                value: "download-images",
            },
        ],
    })

    switch (init.actions) {
        case "debug":
            await exportDebugInfo()
            break
        case "download-images":
            await downloadImagePack()
            break
        case "download-contract":
            await downloadContract()
            break
        default:
            log(LogLevel.ERROR, "Unknown action!")
    }
}

async function exportDebugInfo(): Promise<void> {
    const cpus = cpuList().map((cpu, index) => ({
        core: index + 1,
        ...cpu,
    }))

    const files = await readdir(process.cwd())
    const plugins = await Promise.allSettled(
        [
            ...files.filter((file) => isPlugin(file, "js")),
            ...files.filter((file) => isPlugin(file, "cjs")),
        ].map(async (plugin) => {
            return `${plugin} (${await md5File(plugin)})`
        }),
    )

    const data = {
        version: PEACOCKVERSTRING,
        ident: PEACOCKVER,
        presentConfigs: getSwizzleable(),
        chunkDigest: await md5File("chunk0.js"),
        patcherDigest: await md5File("PeacockPatcher.exe"),
        runtimeVersions: process.versions,
        os: `${platform()} (${arch()}) - Release: ${version()}`,
        cpus,
        plugins,
        flags: getAllFlags(),
    }

    await writeFile("DEBUG_PROFILE.json", JSON.stringify(data, undefined, 4))
    log(
        LogLevel.INFO,
        "Successfully outputted debugging data to DEBUG_PROFILE.json!",
    )
}

async function downloadContract(): Promise<void> {
    log(LogLevel.INFO, "Contract downloading tool - powered by HITMAPS")
    log(
        LogLevel.INFO,
        "NOTE: This tool only works for HITMAN 3 contracts that are on Stadia, Steam, Epic, or PlayStation.",
    )

    const { contractId } = await prompts({
        type: "text",
        name: "contractId",
        message: "Enter the contract ID (with dashes)",
    })

    const result = await Controller._hitmapsFetchContract(contractId)

    if (!result) {
        log(
            LogLevel.ERROR,
            `Unable to resolve ${contractId}. This may be because HITMAPS' bot is not authenticated, or the contract was not found.`,
        )
        return
    }

    result.Metadata.CreatorUserId = "fadb923c-e6bb-4283-a537-eb4d1150262e"

    if (!existsSync("contracts")) {
        mkdirSync("contracts")
    }

    await writeFile(
        `contracts/${contractId}.json`,
        JSON.stringify(result, undefined, 4),
    )

    log(LogLevel.INFO, "Successfully saved the contract!")
}

async function downloadImagePack(): Promise<void> {
    // the code below very likely triggers a memory leak!
    // the streams might not actually be destroyed properly, but I don't really care, as the process
    // should end after running this

    const writer = createWriteStream(
        pathResolve(__dirname, "offlineassets.zip"),
    )

    const totalLength = IMAGE_PACK_LEN
    log(LogLevel.INFO, "Starting asset download...")

    let resp

    try {
        // eslint-disable-next-line prefer-const
        resp = await axios.get<Stream>(IMAGE_PACK_BIN, {
            responseType: "stream",
        })
    } catch (e) {
        log(LogLevel.ERROR, "Unable to complete download due to an error!")
        throw e
    }

    const progressBar = new ProgressBar(
        `${picocolors.blue("--> Downloading")} [:bar] ${picocolors.magenta(
            "(:percent)",
        )}`,
        {
            width: 40,
            complete: "=",
            incomplete: " ",
            renderThrottle: 1,
            total: totalLength,
        },
    )

    resp.data.on("data", (chunk) => {
        progressBar.tick(chunk.length)
    })

    resp.data.pipe(writer)

    await new Promise<void>((resolve) => {
        writer.on("finish", resolve)
    })

    log(LogLevel.INFO, "Extracting files...")

    const zipFS = new ZipFS(ppath.resolve("offlineassets.zip" as Filename), {
        readOnly: true,
    })

    await xfs.copyPromise(
        ppath.resolve("images" as PortablePath),
        `/${IMAGE_PACK_BASE_DIR}/images` as PortablePath,
        {
            baseFs: zipFS,
            overwrite: true,
        },
    )

    log(LogLevel.INFO, "Done!")
    await xfs.unlinkPromise("offlineassets.zip" as Filename)
}
