import { existsSync, readFileSync } from "fs"
import path from "path"
import { IIniObjectSection, IniValue } from "js-ini"
import { menuSystemDatabase } from "./menuSystem"
import { Flag, FlagSection, GameVersion } from "../types/types"
import { defaultFlags, getAllFlags, saveFlags, setFlag } from "../flags"
import { CommandFunction, commandService } from "../commandService"

interface GetAllFlagsResponse {
    key: string
    title: string
    description: string
    // defaultValue?: string | number | boolean
    possibleValues?: string[]
    valueType: "category" | "boolean" | "string" | "number" | "enum"
    value: GetAllFlagsResponse[] | boolean | string | number
}

interface SetFlagArgs {
    key: string
    value: string
}

const commandMap = new Map<string, CommandFunction>([
    ["getAllFlags", commandGetAllFlags as CommandFunction],
    ["setFlagBoolean", commandSetFlagBoolean as CommandFunction],
    ["setFlagEnum", commandSetFlagEnum as CommandFunction],
])

const pluginPrefix = "/pages/peacock-menu/"
const jsonExtension = ".json"

function getDatabaseDiff(configs: string[], gameVersion: GameVersion) {
    if (gameVersion === "h3") {
        configs.push(
            "menusystem/elements/settings/ioiaccount/ioiaccount_maintab.json",
        )
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getConfig(name: string, _gameVersion: GameVersion) {
    if (name.endsWith("ioiaccount/ioiaccount_maintab.json")) {
        name = "/pages/peacock-menu/index.json"
    }

    if (!name.startsWith(pluginPrefix)) {
        return
    }

    const fileName = name.substring(pluginPrefix.length)
    const cacheBusterIndex = fileName.indexOf(jsonExtension)
    const fileNameWithCacheBuster =
        cacheBusterIndex < 0
            ? fileName
            : fileName.substring(0, cacheBusterIndex + jsonExtension.length)

    const filePath = path.join(
        process.cwd(),
        "static",
        "peacock-menu",
        fileNameWithCacheBuster,
    )

    if (existsSync(filePath)) {
        return JSON.parse(readFileSync(filePath).toString())
    }

    return undefined
}

function getFlagType(
    defaultFlag: Flag,
    value: IniValue,
): {
    valueType: "boolean" | "string" | "number" | "enum"
    value: boolean | string | number
} {
    if (defaultFlag.possibleValues) {
        return {
            valueType: "enum",
            value: <string>value,
        }
    }

    switch (typeof defaultFlag.default) {
        case "string":
            return {
                valueType: "string",
                value: <string>value,
            }

        case "number":
            return {
                valueType: "number",
                value: <number>value,
            }

        case "boolean":
            return {
                valueType: "boolean",
                value: <boolean>value,
            }
    }
}

function commandGetAllFlags(): GetAllFlagsResponse[] {
    const allFlags = getAllFlags()

    const flagsArray: GetAllFlagsResponse[] = []

    for (const sectionKey of Object.keys(allFlags)) {
        const defaultSection = defaultFlags[sectionKey]

        flagsArray.push({
            key: `${sectionKey}`,
            title: defaultSection.title,
            description: defaultSection.desc,
            valueType: "category",
            value: commandGetAllFlagsForSection(
                sectionKey,
                defaultSection,
                allFlags[sectionKey] as IIniObjectSection,
            ),
        })
    }

    return flagsArray
}

function commandGetAllFlagsForSection(
    sectionKey: string,
    section: FlagSection,
    sectionValues: IIniObjectSection,
): GetAllFlagsResponse[] {
    const flagsArray: GetAllFlagsResponse[] = []

    const categoryMap = new Map<string, GetAllFlagsResponse>()

    for (const flagKey of Object.keys(section.flags)) {
        const flag = section.flags[flagKey]

        if (flag.showIngame === false) {
            continue
        }

        const flagsType = getFlagType(flag, sectionValues[flagKey])

        if (!flagsType) {
            continue
        }

        const noteLines = []

        if (flag.requiresGameRestart) {
            noteLines.push(
                "Game has to be restarted before changes take effect!",
            )
        }

        if (flag.requiresPeacockRestart) {
            noteLines.push(
                "Peacock has to be restarted before changes take effect!",
            )
        }

        const flagResult = {
            key: `${sectionKey}.${flagKey}`,
            title: flag.title,
            description: `${flag.desc}\n\nDefault value: ${flag.default}${noteLines.length > 0 ? "\n\nNotes:\n- " + noteLines.join("\n- ") : ""}`,
            // defaultValue: flag.default,
            possibleValues: flag.possibleValues,
            ...flagsType,
        }

        if (flag.category) {
            let categoryFlag = categoryMap.get(flag.category)

            if (!categoryFlag) {
                categoryFlag = {
                    key: `${sectionKey}.${flag.category}`,
                    title: flag.category,
                    description: "",
                    valueType: "category",
                    value: [],
                }

                categoryMap.set(flag.category, categoryFlag)
            }

            ;(categoryFlag.value as GetAllFlagsResponse[]).push(flagResult)
        } else {
            flagsArray.push(flagResult)
        }
    }

    const categoryFlags = [...categoryMap.values()]

    return [...categoryFlags, ...flagsArray]
}

function commandSetFlagBoolean(
    _lastResponse: unknown,
    args: SetFlagArgs,
): void {
    const keys = args.key.split(".")
    const section = keys[0]
    const key = keys[1]

    if (!defaultFlags[section]?.flags[key]) {
        return
    }

    setFlag(args.key, args.value === "true")

    saveFlags()
}

function commandSetFlagEnum(_lastResponse: unknown, args: SetFlagArgs): void {
    const keys = args.key.split(".")
    const section = keys[0]
    const key = keys[1]

    if (!defaultFlags[section]?.flags[key]) {
        return
    }

    setFlag(args.key, args.value)

    saveFlags()
}

// TODO: Prevent refresh of UI after setFlag and/or remember context (maybe set-value?)
// TODO: Add to pause menu
// TODO: Add support for plugins to add custom menus
// TODO: Reload plugin settings hook
// TODO: Restart peacock option?
// TODO: Add command to swap profile
// TODO: Add command to reset profile

export function initializePeacockMenu(): void {
    menuSystemDatabase.hooks.getDatabaseDiff.tap("PeacockMenu", getDatabaseDiff)
    menuSystemDatabase.hooks.getConfig.tap("PeacockMenu", getConfig)

    commandService.handleCommandMap("PeacockMenu", commandMap)
}
