import { Controller } from "@peacockproject/core/controller"
import { menuSystemDatabase } from "@peacockproject/core/menus/menuSystem"
import {
    Flag,
    FlagSection,
    GameVersion,
} from "@peacockproject/core/types/types"
import { LogLevel, log } from "@peacockproject/core/loggingInterop"
import { handleCommand as handleCommandHook } from "@peacockproject/core/profileHandler"
import {
    defaultFlags,
    getAllFlags,
    saveFlags,
    setFlag,
} from "@peacockproject/core/flags"
import { existsSync, readFileSync } from "fs"
import path from "path"
import { IIniObjectSection, IniValue } from "js-ini"

interface modalTestResponse {
    Count: number
}

interface buttonTestResponse {
    Count: number
}

interface forEachTestResponse {
    Title: string
    Body: string
}

interface getAllFlagsResponse {
    key: string
    title: string
    description: string
    // defaultValue?: string | number | boolean
    possibleValues?: string[]
    valueType: "category" | "boolean" | "string" | "number" | "enum"
    value: getAllFlagsResponse[] | boolean | string | number
}

interface setFlagArgs {
    key: string
    value: string
}

type commandFunction = (
    lastResponse: unknown | undefined,
    args: unknown,
) => unknown

const commandMap = new Map<string, commandFunction>([
    ["modalTest", commandModalTest as commandFunction],
    ["buttonTest", commandButtonTest as commandFunction],
    ["forEachTest", commandForEachTest as commandFunction],
    ["getAllFlags", commandGetAllFlags as commandFunction],
    ["setFlagBoolean", commandSetFlagBoolean as commandFunction],
    ["setFlagEnum", commandSetFlagEnum as commandFunction],
])

const pluginPrefix = "/plugins/peacock-menu/"
const jsonExtension = ".json"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getDatabaseDiff(_configs: string[], _gameVersion: GameVersion) {
    return
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getConfig(name: string, _gameVersion: GameVersion) {
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
        "plugins",
        "peacock-menu",
        fileNameWithCacheBuster,
    )

    if (existsSync(filePath)) {
        return JSON.parse(readFileSync(filePath).toString())
    }

    return undefined
}

function commandModalTest(lastResponse: modalTestResponse): modalTestResponse {
    let count = (lastResponse || { Count: 0 }).Count

    return {
        Count: ++count,
    }
}

function commandButtonTest(
    lastResponse: buttonTestResponse,
): buttonTestResponse {
    let count = (lastResponse || { Count: 0 }).Count

    return {
        Count: ++count,
    }
}

function commandForEachTest(): forEachTestResponse[] {
    return [
        {
            Title: "Title #1",
            Body: "Body #1",
        },
        {
            Title: "Title #2",
            Body: "Body #2",
        },
        {
            Title: "Title #3",
            Body: "Body #3",
        },
    ]
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

function commandGetAllFlags(): getAllFlagsResponse[] {
    const allFlags = getAllFlags()

    const flagsArray: getAllFlagsResponse[] = []

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
): getAllFlagsResponse[] {
    const flagsArray: getAllFlagsResponse[] = []

    const categoryMap = new Map<string, getAllFlagsResponse>()

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

            ;(categoryFlag.value as getAllFlagsResponse[]).push(flagResult)
        } else {
            flagsArray.push(flagResult)
        }
    }

    const categoryFlags = [...categoryMap.values()]

    return [...categoryFlags, ...flagsArray]
}

function commandSetFlagBoolean(
    _lastResponse: unknown,
    args: setFlagArgs,
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

function commandSetFlagEnum(_lastResponse: unknown, args: setFlagArgs): void {
    const keys = args.key.split(".")
    const section = keys[0]
    const key = keys[1]

    if (!defaultFlags[section]?.flags[key]) {
        return
    }

    setFlag(args.key, args.value)

    saveFlags()
}

function handleCommand(
    lastResponse: unknown,
    command: string,
    args: unknown,
): unknown {
    if (commandMap.has(command)) {
        return commandMap.get(command)!(lastResponse, args)
    }

    // TODO: Prevent refresh of UI after setFlag and/or remember context (maybe set-value?)
    // TODO: Add to pause menu
    // TODO: Add support for plugins to add custom menus
    // TODO: Reload plugin settings hook
    // TODO: Restart peacock option?
    // TODO: Add plugin for all weapons unlock
    // TODO: Add command to swap profile
    // TODO: Add command to reset profile

    return undefined
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function initPlugin(_controller: Controller): void {
    log(LogLevel.INFO, "[Plugin] Peacock Menu", "peacock-menu")

    menuSystemDatabase.hooks.getDatabaseDiff.tap("PeacockMenu", getDatabaseDiff)
    menuSystemDatabase.hooks.getConfig.tap("PeacockMenu", getConfig)
    handleCommandHook.tap("PeacockMenu", handleCommand)
}

module.exports = initPlugin
