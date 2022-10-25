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

import { existsSync } from "fs"
import { join } from "path"
import millis from "ms"
import { mkdir, readdir, readFile, unlink, writeFile } from "fs/promises"
import { createHash } from "crypto"
import { Packr } from "msgpackr"
import { brotliCompress } from "zlib"
import { promisify } from "util"

const packer = new Packr({
    bundleStrings: true,
})

async function readJson(filePath) {
    return JSON.parse((await readFile(filePath)).toString())
}

export async function packContractsAndChallenges() {
    const resources = join("resources", "challenges")

    if (!existsSync(resources)) {
        await mkdir(resources)
    } else {
        for (const crp of await readdir(resources)) {
            await unlink(join(resources, crp))
        }
    }

    const start = Date.now()

    const subdirs = await readdir("contractdata")
    const b = []
    const el = []

    const handleChallengeFile = async (name, contents) => {
        const targetName = createHash("md5").update(name).digest("hex")

        await writeFile(
            join(resources, `${targetName}.crp`),
            packer.pack(contents),
        )
    }

    for (const location of subdirs) {
        const handleContract = async (contract) => {
            if (
                [
                    "FREEDOMFIGHTERSLEGACY.json",
                    "THELASTYARDBIRD_SCPC.json",
                ].includes(contract)
            ) {
                return
            }

            if (contract.includes(".d.ts")) {
                // type definition stub
                return
            }

            const json = await readJson(
                join("contractdata", location, contract),
            )

            if (contract.startsWith("_")) {
                // _<LOCATION>_CHALLENGES.json
                await handleChallengeFile(contract + "#packed", json)
                return
            }

            switch (json?.Metadata?.Type) {
                case "elusive":
                    el.push(json)
                    break
                default:
                    b.push(json)
            }
        }

        const currentLocation = join("contractdata", location)
        const locationElements = await readdir(currentLocation)

        for (const element of locationElements) {
            await handleContract(element)
        }
    }

    const d = JSON.stringify({ b, el })
    const compressed = await promisify(brotliCompress)(d)
    await writeFile("resources/contracts.br", compressed)

    console.log(
        `Gathered built-in contracts and challenges in ${millis(
            Date.now() - start,
        )}`,
    )
}
