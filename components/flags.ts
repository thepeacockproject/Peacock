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

import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs"
import type { Flags } from "./types/types"
import { log, LogLevel } from "./loggingInterop"
import { parse } from "js-ini"
import type { IIniObject } from "js-ini/lib/interfaces/ini-object"

let flags: IIniObject = {}

const defaultFlags: Flags = {
    discordRp: {
        desc: "Toggle Discord rich presence on or off.",
        default: false,
    },
    discordRpAppTime: {
        desc: "For Discord Rich Presence, if set to false, the time playing the current level will be shown, and if set to true, the total time using Peacock will be shown.",
        default: false,
    },
    liveSplit: {
        desc: "Toggle LiveSplit support on or off",
        default: false,
    },
    autoSplitterCampaign: {
        desc: "Which (main) campaign to use for the AutoSplitter. Can be set to 1, 2, 3, or 'trilogy'.",
        default: "trilogy",
    },
    autoSplitterRacetimegg: {
        desc: "When set to true, autosplitter is set in a special mode for use with livesplit integration for racetime.gg realtime races.",
        default: false,
    },
    autoSplitterForceSilentAssassin: {
        desc: "When set to true, the autosplitter will only accept missions completed with silent assassin to be valid completions. When false, any completion will split.",
        default: true,
    },
    jokes: {
        desc: "The Peacock server window will tell you a joke on startup if this is set to true.",
        default: false,
    },
    leaderboardsHost: {
        desc: "Please do not modify - intended for development only",
        default: "https://backend.rdil.rocks",
    },
    leaderboards: {
        desc: "Allow your times to be submitted to the ingame leaderboards. If you do not want your times on the leaderboards, change this to false.",
        default: true,
    },
    updateChecking: {
        desc: "Allow Peacock to check for updates on startup.",
        default: true,
    },
    loadoutSaving: {
        desc: "Default loadout mode - either PROFILES (loadout profiles) or LEGACY for per-user saving",
        default: "PROFILES",
    },
    elusivesAreShown: {
        desc: "Show elusive targets in instinct like normal targets would appear on normal missions. (for speedrunners who are submitting to speedrun.com, just as a reminder, this tool is for practice only!)",
        default: false,
    },
    imageLoading: {
        desc: "How images are loaded. SAVEASREQUESTED will fetch images from online when needed (and save them in the images folder), ONLINE will fetch them without saving, and OFFLINE will load them from the image folder",
        default: "SAVEASREQUESTED",
    },
    overrideFrameworkChecks: {
        desc: "Forcibly disable installed mod checks",
        default: false,
    },
    experimentalHMR: {
        desc: "[Experimental] Toggle hot reloading of contracts",
        default: false,
    },
    developmentPluginDevHost: {
        desc: "[Development - Workspace required] Toggle loading of plugins with a .ts/.cts extension inside the /plugins folder",
        default: false,
    },
    legacyContractDownloader: {
        desc: "When set to true, the official servers will be used for contract downloading in H3, which only works for the platform you are playing on. When false, the HITMAPS servers will be used instead. Note that this option only pertains to H3. Official servers will be used for H1 and H2 regardless of the value of this option.",
        default: false,
    },
    developmentTestMode: {
        desc: "[Development] Toggle running of test code to verify functionality during runtime",
        default: false,
    },
}

const OLD_FLAGS_FILE = "flags.json5"
const NEW_FLAGS_FILE = "options.ini"

/**
 * Get a flag from the flag file.
 *
 * @param flagId The flag's name.
 * @returns The flag's value.
 */
export function getFlag(flagId: string): string | boolean | number {
    return (
        (flags[flagId] as string | boolean | number) ??
        defaultFlags[flagId].default
    )
}

/**
 * At this point, you may be asking "what on Earth does this do?" - I completely understand.
 *
 * It should do something along the lines of generating a string that is the flags
 * file with the appropriate comments (js-ini's stringify doesn't support them),
 * and all the flags will either be the default value, or what they are set to already.
 */
const makeFlagsIni = (
    _flags: IIniObject | { desc: string; default: string }[],
): string =>
    Object.keys(defaultFlags)
        .map((flagId) => {
            return `; ${defaultFlags[flagId].desc}
${flagId} = ${_flags[flagId]}`
        })
        .join("\n\n")

/**
 * Loads all flags.
 */
export function loadFlags(): void {
    // somebody please, clean this method up, I hate it
    if (existsSync(OLD_FLAGS_FILE)) {
        log(
            LogLevel.WARN,
            "The flags file (flags.json5) has been revamped in the latest Peacock version, and we had to remove your settings.",
        )
        log(
            LogLevel.INFO,
            "You can take a look at the new options.ini file, which includes descriptions and more!",
        )

        unlinkSync(OLD_FLAGS_FILE)
    }

    if (!existsSync(NEW_FLAGS_FILE)) {
        const allTheFlags = {}

        Object.keys(defaultFlags).forEach((f) => {
            allTheFlags[f] = defaultFlags[f].default
        })

        const ini = makeFlagsIni(allTheFlags)

        writeFileSync(NEW_FLAGS_FILE, ini)
    }

    flags = parse(readFileSync(NEW_FLAGS_FILE).toString())

    Object.keys(defaultFlags).forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(flags, key)) {
            flags[key] = defaultFlags[key].default
        }
    })

    writeFileSync(NEW_FLAGS_FILE, makeFlagsIni(flags))

    log(LogLevel.DEBUG, "Loaded flags.")
}

/**
 * Get the values of all flags. Only intended for debugging purposes, since this could cause memory issues.
 *
 * @internal
 * @return The flags.
 */
export function getAllFlags(): IIniObject {
    return flags
}
