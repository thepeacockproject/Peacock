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

const fs = require("fs")
const { execSync } = require("child_process")

const rpkgCli = `"resources/rpkg-cli.exe"`
const hmlt = `"resources/HMLanguageTools.exe"`

const locale = JSON.parse(fs.readFileSync("resources/locale.json").toString())

console.log("Generating locale for H2/H3...")

const h3Locale = {
    hash: "[assembly:/localization/hitman6/conversations/ui/pro/menutext_drp.sweetmenutext].pc_localized-textlist",
    languages: {
        xx: {
            UI_DRP_001: "UI_DRP_001",
        },
        en: locale["english"],
        fr: locale["french"],
        it: locale["italian"],
        de: locale["german"],
        es: locale["spanish"],
        ru: locale["russian"],
        cn: locale["chineseSimplified"],
        tc: locale["chineseTraditional"],
        jp: locale["japanese"],
    },
}

const h2Locale = {
    hash: "[assembly:/localization/hitman6/conversations/ui/pro/menutext_drp.sweetmenutext].pc_localized-textlist",
    languages: {
        xx: {
            UI_DRP_001: "UI_DRP_001",
        },
        en: locale["english"],
        fr: locale["french"],
        it: locale["italian"],
        de: locale["german"],
        es: locale["spanish"],
        ru: locale["russian"],
        mx: locale["spanishMexican"],
        br: locale["portugueseBrazil"],
        pl: locale["polish"],
        cn: locale["chineseSimplified"],
        jp: locale["japanese"],
        tc: locale["chineseTraditional"],
    },
}

fs.writeFileSync("resources/locale_h3.json", JSON.stringify(h3Locale, null, 4))
fs.writeFileSync("resources/locale_h2.json", JSON.stringify(h2Locale, null, 4))

h3Locale["hash"] =
    "[assembly:/localization/hitman6/conversations/ui/pro/online/peacock.sweetmenutext].pc_localized-textlist"
fs.writeFileSync(
    "resources/peacockstrings.locr.json",
    JSON.stringify(h3Locale, null, 4),
)

console.log("Rebuilding JSON to LOCR...")

execSync(
    `${hmlt} rebuild H2 LOCR resources/locale_h2.json resources/dynamic_resources_h2/00962CB9FEA57C86.LOCR --metapath resources/dynamic_resources_h2/00962CB9FEA57C86.LOCR.meta.json`,
)

execSync(
    `${hmlt} rebuild H3 LOCR resources/locale_h3.json resources/dynamic_resources_h3/00962CB9FEA57C86.LOCR --metapath resources/dynamic_resources_h3/00962CB9FEA57C86.LOCR.meta.json`,
)

console.log("Generating RPKGs...")

execSync(
    `${rpkgCli} -output_path resources -generate_rpkg_from resources/dynamic_resources_h2`,
)

execSync(
    `${rpkgCli} -output_path resources -generate_rpkg_from resources/dynamic_resources_h3`,
)

console.log("Successfully rebuilt dynamic resources!")
