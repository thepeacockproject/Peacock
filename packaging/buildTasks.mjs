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

import { existsSync } from "fs"
import { basename, join, sep } from "path"
import millis from "ms"
import { mkdir, readdir, readFile, unlink, writeFile } from "fs/promises"
import { createHash } from "crypto"
import { Packr } from "msgpackr"
import { brotliCompress } from "zlib"
import { promisify } from "util"
import glob from "fast-glob"
import prettier from "prettier"

const packer = new Packr({
    bundleStrings: true,
})

async function readJson(filePath) {
    return JSON.parse((await readFile(filePath)).toString())
}

async function createResourcesFolder(resources) {
    if (!existsSync(resources)) {
        await mkdir(resources)
    } else {
        for (const prp of await readdir(resources)) {
            await unlink(join(resources, prp))
        }
    }
}

async function handleFile(resources, name, contents) {
    const targetName = createHash("md5").update(name).digest("hex")

    await writeFile(join(resources, `${targetName}.prp`), packer.pack(contents))
}

export async function generateRequireTable() {
    const files = glob.sync("**/*.ts", {
        cwd: "./components",
        ignore: [
            "tools.ts",
            "index.ts",
            "generatedPeacockRequireTable.ts",
            "types/globals.d.ts",
            "types/*.ts",
            "cli.ts",
        ],
    })

    const imports = []
    const requiresTable = []

    for (const e of files) {
        const variable = basename(e, ".ts")
        const importPath = e.replaceAll(sep, "/").replace(/\.ts$/, "")

        imports.push(`import * as ${variable} from "./${importPath}"`)
        requiresTable.push(`"@peacockproject/core/${importPath}": ${variable}`)
    }

    const prettierConfig = {
        parser: "babel",
        semi: false,
        tabWidth: 4,
        trailingComma: "all",
    }

    // language=TypeScript
    const generatedPeacockRequireTableFile = await prettier.format(
        `/*
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

        ${imports.join("\n")}

        export default {
            ${requiresTable.join(",\n")}
        }`,
        prettierConfig,
    )

    await writeFile(
        "components/generatedPeacockRequireTable.ts",
        generatedPeacockRequireTableFile,
    )
}

export async function packResources() {
    const challengesResources = join("resources", "challenges")
    await createResourcesFolder(challengesResources)

    const masteryResources = join("resources", "mastery")
    await createResourcesFolder(masteryResources)

    const start = Date.now()

    const contracts = await glob("contractdata/**/*.json")
    const b = []
    const el = []

    for (const path of contracts) {
        const filename = basename(path)

        if (
            [
                "FREEDOMFIGHTERSLEGACY.json",
                "THELASTYARDBIRD_SCPC.json",
            ].includes(filename)
        ) {
            continue
        }

        if (filename.includes(".d.ts")) {
            return
        }

        const json = await readJson(path)

        if (filename.endsWith("_CHALLENGES.json")) {
            // _LOCATION_CHALLENGES.json
            await handleFile(challengesResources, filename + "#packed", json)
            continue
        }

        if (filename.endsWith("_MASTERY.json")) {
            // _LOCATION_MASTERY.json
            await handleFile(masteryResources, filename + "#packed", json)
            continue
        }

        // dev scope
        if (json.Metadata.PublicId?.startsWith("0")) {
            delete json.Metadata.PublicId
        }

        if (json.Metadata.LastUpdate) {
            delete json.Metadata.LastUpdate
        }

        if (json.Metadata.Release) {
            delete json.Metadata.Release
        }

        if (json.Metadata.ServerVersion) {
            delete json.Metadata.ServerVersion
        }

        if (json.Metadata.GameVersion) {
            delete json.Metadata.GameVersion
        }

        if (json.Metadata.CreationTimestamp) {
            delete json.Metadata.CreationTimestamp
        }

        if (json.Metadata.CodeName_Hint) {
            delete json.Metadata.CodeName_Hint
        }

        switch (json?.Metadata?.Type) {
            case "elusive":
                el.push(json)
                break
            default:
                b.push(json)
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
