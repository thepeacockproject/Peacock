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

import { describe, expect, it } from "vitest"
import { glob } from "fast-glob"
import { readFile } from "fs/promises"
import { MissionManifest } from "../../components/types/types"
import { unpack } from "msgpackr"
import { crc32 } from "@aws-crypto/crc32"

const allContractFiles = (
    await glob("**/*.json", {
        cwd: "../contractdata",
    })
).filter((file) => !file.includes("CHALLENGES") && !file.includes("MASTERY"))

type LocWrap = {
    $loc: { key: string; data: string | number[] }
}

function parseLocString(locString: string | LocWrap) {
    if ((locString as LocWrap)?.$loc?.key) {
        return (locString as LocWrap).$loc.key
    }

    if ((locString as string).includes("$loc")) {
        const parts = (locString as string).split(" ")
        // i hate this
        const double = (locString as string).includes("$loc $loc")
        return parts[double ? 2 : 1] ?? ""
    }

    return locString as string
}

// this is a list of all the crc32s that the game defines for localization
const gameCrcs: number[] = unpack(
    await readFile("testData/game-defined-locr-crc32s.msgpack"),
)

function getCrc(str: string) {
    return crc32(Buffer.from(str))
}

let peacockCrcs: number[]

{
    const strings = JSON.parse(
        (await readFile("../resources/locale.json")).toString(),
    )["english"]

    peacockCrcs = Object.keys(strings).map(getCrc)
}

const allCrcs = [...peacockCrcs, ...gameCrcs]

const ignored = [
    "UI_CONTRACT_RAT_OBJ_DATACORE_OPTIONAL_TITLE",
    "UI_CONTRACT_FOX_ELIMINATE_REMAINING_LESSER_AGENTS_TITLE",
    "UI_CONTRACT_FOX_ELIMINATE_REMAINING_LESSER_AGENTS_OBJ",
    "UI_CONTRACT_FOX_ELIMINATE_REMAINING_LESSER_AGENTS_DESC",
    "$UI_CONTRACT_JACARANDA_OBJECTIVE_SNIPER_NAME",
    "UI_CONTRACT_GLORIOSA_OBJ_1_NAME",
    "UI_CONTRACT_RAFFLESIA_OBJ_2_NAME",
    "UI_CONTRACT_RAFFLESIA_OBJ_3_NAME",
    "UI_CONTRACT_TITANUMARUM_OBJ_1_NAME",
    "UI_CONTRACT_TITANUMARUM_OBJ_2_NAME",
    "UI_CONTRACT_HOLLY_OBJ_3_NAME",
    "UI_CONTRACT_HOLLY_OBJ_4_NAME",
    "UI_CONTRACT_GORSE_OBJ_1_NAME",
    "UI_CONTRACT_GORSE_OBJ_3_NAME",
    "UI_CONTRACT_GORSE_OBJ_4_NAME",
    "UI_CONTRACT_GORSE_OBJ_5_NAME",
    "UI_CONTRACT_GORSE_OBJ_6_NAME",
    "UI_CONTRACT_GORSE_OBJ_7_NAME",
    "UI_CONTRACT_GORSE_OBJ_2_NAME",
]

describe("contract files", () => {
    it("contract objectives have working localization", async () => {
        for (const file of allContractFiles) {
            const contract: MissionManifest = JSON.parse(
                (await readFile(`../contractdata/${file}`)).toString(),
            )

            if (contract.Metadata.Type === "featured") {
                continue
            }

            for (const objective of contract.Data.Objectives || []) {
                if (objective.BriefingText) {
                    const loc = parseLocString(
                        objective.BriefingText,
                    ).toUpperCase()

                    if (!ignored.includes(loc) && !loc.startsWith("$.")) {
                        const i = getCrc(loc)

                        expect(
                            allCrcs,
                            `${file} objective ${objective.Id} BriefingText (${loc}) in defined strings`,
                        ).toContain(i)
                    }
                }

                if (objective.BriefingName) {
                    const loc = parseLocString(
                        objective.BriefingName,
                    ).toUpperCase()

                    if (!ignored.includes(loc) && !loc.startsWith("$.")) {
                        const i = getCrc(loc)

                        expect(
                            allCrcs,
                            `${file} objective ${objective.Id} BriefingName (${loc}) in defined strings`,
                        ).toContain(i)
                    }
                }

                if (objective.HUDTemplate?.display) {
                    const loc = parseLocString(
                        objective.HUDTemplate.display,
                    ).toUpperCase()

                    if (!ignored.includes(loc) && !loc.startsWith("$.")) {
                        const i = getCrc(loc)

                        expect(
                            allCrcs,
                            `${file} objective ${objective.Id} HUDTemplate.display (${loc}) in defined strings`,
                        ).toContain(i)
                    }
                }
            }
        }
    })
})
