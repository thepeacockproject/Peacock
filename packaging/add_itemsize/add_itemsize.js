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

// Usage:
// - Go to https://glaciermodding.org/rpkg/ and click "Download latest CLI"
// - Extract contents of downloaded zip file to packaging/add_itemsize/
// - From packaging/add_itemsize/ directory, run: node add_itemsize.js <path to Runtime> <Game Version (H1 / H2 / H3 / Scpc)>
// - E.g. node add_itemsize.js "C:\Program Files\Epic Games\HITMAN3\Runtime" H3
// - either H2 or H3 Runtime path seem to work for Scpc Game Version

async function main() {
    const fs = require("fs")
    const rpkgCli = `"./rpkg-cli.exe"`
    const { execSync } = require("child_process")
    let chunk0patches = fs
        .readdirSync(`${process.argv[2]}`)
        .filter((fn) => fn.includes("chunk0") && !fn.includes("300.rpkg"))
    let gameprefix = ""
    if (process.argv[3] === "H1") {
        gameprefix = "Legacy"
    } else if (process.argv[3] === "H2") {
        gameprefix = "H2"
    } else if (process.argv[3] === "Scpc") {
        gameprefix = "Scpc"
    }

    // Something about how this is reading in the json also removes the decimal from whole numbers (e.g. 1.0 becomes 1)
    // See: allunlockables[i].Properties.Gameplay.damage for example
    let allunlockables = require(
        `../../static/${gameprefix}allunlockables.json`,
    )

    // Run on every chunk0patch file just in case
    for (let i = 0; i < chunk0patches.length; i++) {
        console.log(`${chunk0patches[i]} detected`)
        execSync(
            `${rpkgCli} -output_path "./" -filter REPO -extract_from_rpkg "${process.argv[2]}/${chunk0patches[i]}"`,
        )
        let searchIndexStart = "chunk0"
        let searchIndexEnd = ".rpkg"
        let chunkvar = chunk0patches[i].slice(
            chunk0patches[i].indexOf(searchIndexStart),
            chunk0patches[i].indexOf(searchIndexEnd),
        )
        let repofiles = fs
            .readdirSync(`${chunkvar}/REPO`)
            .filter((fn) => fn.endsWith(".REPO"))

        let orig = `${chunkvar}/REPO/${repofiles[0]}`
        let newfile = `${chunkvar}/REPO/${repofiles[0].slice(
            0,
            repofiles[0].length - 5,
        )}.json`
        await fs.promises
            .copyFile(orig, newfile)
            .then(function () {
                console.log(`${newfile} file copied`)
            })
            .catch(function (error) {
                console.log(error)
            })
        let repochunk0 = require(`../add_itemsize/${newfile}`)

        for (let i = 0; i < allunlockables.length; i++) {
            if (
                allunlockables[i].Properties.LoadoutSlot === "gear" ||
                allunlockables[i].Properties.LoadoutSlot ===
                    "concealedweapon" ||
                allunlockables[i].Properties.LoadoutSlot === "carriedweapon"
            ) {
                for (let j = 0; j < repochunk0.length; j++) {
                    if (
                        repochunk0[j].ID_ ===
                        allunlockables[i].Properties.RepositoryId
                    ) {
                        allunlockables[i].Properties.ItemSize =
                            repochunk0[j].ItemSize
                    }
                }
            }
        }
    }

    // Check if any items in original peacock file (allunlockables.json) did not get itemSize updated
    // H2 and H3 do not have: PROP_MELEE_EIFFELSOUVENIR_CLUB, RepositoryId: '7257eaa1-c8f3-4e0c-acbf-74f73869c1b2'
    console.log("Items that did not get itemSize updated:")

    for (let i = 0; i < allunlockables.length; i++) {
        if (
            !allunlockables[i].Properties.ItemSize &&
            allunlockables[i].Properties.LoadoutSlot &&
            (allunlockables[i].Properties.LoadoutSlot === "gear" ||
                allunlockables[i].Properties.LoadoutSlot ===
                    "concealedweapon" ||
                allunlockables[i].Properties.LoadoutSlot === "carriedweapon")
        ) {
            console.log(allunlockables[i])
        }
    }

    const jsonContent = JSON.stringify(allunlockables, null, 4)
    fs.writeFile(
        `../../static/${gameprefix}allunlockables.json`,
        jsonContent,
        "utf8",
        function (err) {
            if (err) {
                return console.log(err)
            }
            console.log(
                `${gameprefix}allunlockables.json file updated with item sizes!`,
            )
            // Might be better to have the user call this themselves, but it resolves line break inconsistencies
            execSync(`yarn prettier`)
        },
    )
}

main()
