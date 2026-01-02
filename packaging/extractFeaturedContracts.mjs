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

import { statSync, mkdirSync } from "fs"
import { writeFile } from "fs/promises"
import pc from "picocolors"
import { Command, Option, runExit } from "clipanion"
import axios from "axios"

/**
 * @param {AxiosInstance} axiosClient
 * @param {string} type
 * @param {number} page
 * @returns {Promise<*>}
 */
async function fetchHitsCategoryPage(axiosClient, type, page) {
    console.log(`${pc.blue`Fetching hits category `}${type} page ${page}...`)

    const url = `/profiles/page/HitsCategory?page=${page}&type=${type}&mode=dataonly`

    const { data } = await axiosClient.get(url)

    return data.data.Data
}

/**
 * @param hits
 * @returns {Promise<{contracts: {[p: string]: MissionManifest}, ids: string[]}>}
 */
async function processHitsCategory(hits) {
    const ids = []
    const contracts = {}
    for (const hit of hits) {
        // Light optimisation
        delete hit.UserCentricContract.Contract.Metadata.GameVersion
        delete hit.UserCentricContract.Contract.Metadata.ServerVersion
        delete hit.UserCentricContract.Contract.Metadata.LastUpdate

        contracts[hit.Id] = hit.UserCentricContract.Contract
        ids.push(hit.Id)
    }

    return { contracts, ids }
}

/**
 * @param {string} jwt
 * @param {string} gameVersion
 * @returns {Promise<{contracts: {[p: string]: MissionManifest}, ids: string[]}>}
 */
async function extract(jwt, gameVersion) {
    const client = axios.create({
        baseURL: `https://${getUrlFromVersion(gameVersion)}/`,
        headers: {
            "User-Agent": "G2 Http/1.0 (Windows NT 10.0; DX12/1; d3d12/1)",
            "Content-Type": "application/json",
            Accept: "application/json, text/*, image/*, application/json",
            Version: gameVersion === "h1" ? "6.74.0" : "8.22.0",
            Authorization: `bearer ${jwt}`,
        },
    })

    console.log(
        `Fetching featured contracts from ${pc.underline(
            getUrlFromVersion(gameVersion),
        )}...`,
    )

    let pageNum = 0
    const main = await fetchHitsCategoryPage(
        client,
        "Featured",
        pageNum++,
        gameVersion,
    )
    let hasMore = main.HasMore

    const mainData = await processHitsCategory(main.Hits)
    const ids = mainData.ids
    let contracts = { ...mainData.contracts }

    while (hasMore) {
        const page = await fetchHitsCategoryPage(
            client,
            "Featured",
            pageNum++,
            gameVersion,
        )
        const data = await processHitsCategory(page.Hits)
        contracts = {
            ...contracts,
            ...data.contracts,
        }
        ids.push(...data.ids)
        hasMore = page.HasMore
    }

    return {
        contracts,
        ids,
    }
}

function getUrlFromVersion(gameVersion) {
    return gameVersion === "h3"
        ? "hm3-service.hitman.io"
        : gameVersion === "h2"
          ? "pc2-service.hitman.io"
          : "pc-service.hitman.io"
}

class ExtractFeaturedContracts extends Command {
    outFolder = Option.String("--out-folder", { required: true })
    jwt = Option.String("--jwt", { required: true })
    // https://youtrack.jetbrains.com/issue/WEB-56917
    // noinspection JSCheckFunctionSignatures
    gameVersion = Option.String("--game-version", "h3")

    static usage = Command.Usage({
        category: `Featured Contracts`,
        description: `Extracts featured contracts into files in the specified folder.`,
        details: ``,
        examples: [
            [`Basic usage`, `$0 --jwt someJsonWebToken --out-folder featured`],
            [
                `With game version`,
                `$0 --jwt someJsonWebToken --out-folder featured --game-version h3`,
            ],
        ],
    })

    async execute() {
        const dir = statSync(this.outFolder, { throwIfNoEntry: false })
        if (!dir) {
            mkdirSync(this.outFolder, { recursive: true })
        } else {
            if (!dir.isDirectory()) {
                console.log("Output folder path exists, but isn't a directory")
                return 1
            }
        }

        const data = await extract(this.jwt, this.gameVersion)

        // We generate a metadata file just to make updating the image pack
        // and release order easier
        const metadata = {
            ids: data.ids,
            images: [],
        }

        for (const [id, contract] of Object.entries(data.contracts)) {
            await writeFile(
                `${this.outFolder}/${id}.json`,
                JSON.stringify(contract, undefined, 4),
            )
            if (
                contract.Metadata.TileImage &&
                !contract.Metadata.TileImage.includes("$repository")
            )
                metadata.images.push(contract.Metadata.TileImage)
        }

        await writeFile(
            `${this.outFolder}/meta.json`,
            JSON.stringify(metadata, undefined, 4),
        )
        return 0
    }
}

// https://youtrack.jetbrains.com/issue/WEB-56917
// noinspection JSCheckFunctionSignatures
await runExit(
    {
        binaryName: "extractFeaturedContracts.mjs",
    },
    ExtractFeaturedContracts,
)
