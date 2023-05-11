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
    gameplayUnlockAllShortcuts: {
        desc: "[Gameplay] When set to true, all shortcuts will always be unlocked.",
        default: false,
    },
    gameplayUnlockAllFreelancerMasteries: {
        desc: "[Gameplay] When set to true, all Freelancer unlocks will always be available.",
        default: false,
    },
    mapDiscoveryState: {
        desc: '[Gameplay] Decides what to do with the discovery state of the maps. REVEALED will reset all map locations to discovered, CLOUDED will reset all maps to undiscovered, and KEEP will keep your current discovery state. Note that these actions will take effect every time you connect to Peacock. Your progress of the "Discover [Location]" challenges will not be affected by this option.',
        default: "KEEP",
    },
    enableMasteryProgression: {
        desc: "[Gameplay] When set to false, mastery progression will be disabled and all unlockables will be awarded at the beginning",
        default: true,
    },
    elusivesAreShown: {
        desc: "[Gameplay] Show elusive targets in instinct like normal targets would appear on normal missions. (for speedrunners who are submitting to speedrun.com, just as a reminder, this tool is for practice only!)",
        default: false,
    },
    jokes: {
        desc: "[Services] The Peacock server window will tell you a joke on startup if this is set to true.",
        default: false,
    },
    leaderboards: {
        desc: "[Services] Allow your times to be submitted to the ingame leaderboards. If you do not want your times on the leaderboards, change this to false.",
        default: true,
    },
    updateChecking: {
        desc: "[Services] Allow Peacock to check for updates on startup.",
        default: true,
    },
    loadoutSaving: {
        desc: "[Services] Default loadout mode - either PROFILES (loadout profiles) or LEGACY for per-user saving",
        default: "PROFILES",
    },
    legacyContractDownloader: {
        desc: "[Services] When set to true, the official servers will be used for contract downloading in H3, which only works for the platform you are playing on. When false, the HITMAPS servers will be used instead. Note that this option only pertains to H3. Official servers will be used for H1 and H2 regardless of the value of this option.",
        default: false,
    },
    imageLoading: {
        desc: "[Services] How images are loaded. SAVEASREQUESTED will fetch images from online when needed (and save them in the images folder), ONLINE will fetch them without saving, and OFFLINE will load them from the image folder",
        default: "SAVEASREQUESTED",
    },
    liveSplit: {
        desc: "[Splitter] Toggle LiveSplit support on or off",
        default: false,
    },
    autoSplitterCampaign: {
        desc: "[Splitter] Which (main) campaign to use for the AutoSplitter. Can be set to 1, 2, 3, or 'trilogy'.",
        default: "trilogy",
    },
    autoSplitterRacetimegg: {
        desc: "[Splitter] When set to true, autosplitter is set in a special mode for use with livesplit integration for racetime.gg realtime races.",
        default: false,
    },
    autoSplitterForceSilentAssassin: {
        desc: "[Splitter] When set to true, the autosplitter will only accept missions completed with silent assassin to be valid completions. When false, any completion will split.",
        default: true,
    },
    discordRp: {
        desc: "[Discord] Toggle Discord rich presence on or off.",
        default: false,
    },
    discordRpAppTime: {
        desc: "[Discord] For Discord Rich Presence, if set to false, the time playing the current level will be shown, and if set to true, the total time using Peacock will be shown.",
        default: false,
    },
    overrideFrameworkChecks: {
        desc: "[Modding] Forcibly disable installed mod checks",
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
    developmentAllowRuntimeRestart: {
        desc: "[Development] When set to true, it will be possible to restart Peacock while the game is running and connected.",
        default: false,
    },
    leaderboardsHost: {
        desc: "[Development] Please do not modify - intended for development only",
        default: "https://backend.rdil.rocks",
    },
    developmentLogRequests: {
        desc: "[Development] When set to true, will log the body of all requests the game makes. This can cause huge log files!",
        default: false,
    },
    legacyElusivesEnableSaving: {
        desc: '[Gameplay] When set to true, playing elusive target missions in Hitman 2016 will share the same restarting/replanning/saving rules with normal missions, but the "Elusive Target [Location]" challenges will not be completable. These challenges will only be completable when this option is set to false.',
        default: false,
    },
    getDefaultSuits: {
        desc: `[Gameplay] Set this to true to add all the default starting suits to your inventory. Note: If you set both this and "enableMasteryProgression" to "true" at the same time, a starting suit that is also the unlock for a challenge/mastery will be locked behind its challenge/mastery.`,
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
