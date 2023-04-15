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

import { existsSync, readFileSync, writeFileSync } from "fs"
import type { FlagSection, Flags } from "./types/types"
import { log, LogLevel } from "./loggingInterop"
import { parse } from "js-ini"
import type { IIniObject } from "js-ini/lib/interfaces/ini-object"

let tempFlags: IIniObject = {}
let flags: IIniObject = {}

export const defaultFlags: Flags = {
    peacock: {
        title: "Peacock",
        desc: "Test",
        flags: {
            discordRp: {
                title: "Discord rich presence",
                desc: "Toggle Discord rich presence on or off.",
                default: false,
            },
            discordRpAppTime: {
                title: "discordRpAppTime",
                desc: "For Discord Rich Presence, if set to false, the time playing the current level will be shown, and if set to true, the total time using Peacock will be shown.",
                default: false,
            },
            liveSplit: {
                title: "LiveSplit",
                desc: "Toggle LiveSplit support on or off",
                default: false,
            },
            autoSplitterCampaign: {
                title: "Campaign for AutoSplitter",
                desc: "Which (main) campaign to use for the AutoSplitter. Can be set to 1, 2, 3, or 'trilogy'.",
                possibleValues: ["1", "2", "3", "trilogy"],
                default: "trilogy",
            },
            autoSplitterRacetimegg: {
                title: "AutoSplitter with racetime.gg",
                desc: "When set to true, autosplitter is set in a special mode for use with livesplit integration for racetime.gg realtime races.",
                default: false,
            },
            autoSplitterForceSilentAssassin: {
                title: "Only split when Silent Assassin",
                desc: "When set to true, the autosplitter will only accept missions completed with silent assassin to be valid completions. When false, any completion will split.",
                default: true,
            },
            jokes: {
                title: "jokes",
                desc: "The Peacock server window will tell you a joke on startup if this is set to true.",
                default: false,
            },
            leaderboardsHost: {
                title: "leaderboardsHost",
                desc: "Please do not modify - intended for development only",
                default: "https://backend.rdil.rocks",
            },
            leaderboards: {
                title: "leaderboards",
                desc: "Allow your times to be submitted to the ingame leaderboards. If you do not want your times on the leaderboards, change this to false.",
                default: true,
            },
            updateChecking: {
                title: "updateChecking",
                desc: "Allow Peacock to check for updates on startup.",
                default: true,
            },
            loadoutSaving: {
                title: "loadoutSaving",
                desc: "Default loadout mode - either PROFILES (loadout profiles) or LEGACY for per-user saving",
                possibleValues: ["PROFILES", "LEGACY"],
                default: "PROFILES",
            },
            elusivesAreShown: {
                title: "elusivesAreShown",
                desc: "Show elusive targets in instinct like normal targets would appear on normal missions. (for speedrunners who are submitting to speedrun.com, just as a reminder, this tool is for practice only!)",
                default: false,
            },
            imageLoading: {
                title: "imageLoading",
                desc: "How images are loaded. SAVEASREQUESTED will fetch images from online when needed (and save them in the images folder), ONLINE will fetch them without saving, and OFFLINE will load them from the image folder",
                possibleValues: ["SAVEASREQUESTED", "ONLINE", "OFFLINE"],
                default: "SAVEASREQUESTED",
            },
            overrideFrameworkChecks: {
                title: "overrideFrameworkChecks",
                desc: "Forcibly disable installed mod checks",
                default: false,
            },
            experimentalHMR: {
                title: "experimentalHMR",
                desc: "[Experimental] Toggle hot reloading of contracts",
                default: false,
            },
            developmentPluginDevHost: {
                title: "developmentPluginDevHost",
                desc: "[Development - Workspace required] Toggle loading of plugins with a .ts/.cts extension inside the /plugins folder",
                default: false,
            },
            developmentAllowRuntimeRestart: {
                title: "developmentAllowRuntimeRestart",
                desc: "[Development] When set to true, it will be possible to restart Peacock while the game is running and connected.",
                default: false,
            },
            developmentLogRequests: {
                title: "developmentLogRequests",
                desc: "[Development] When set to true, will log the body of all requests the game makes. This can cause huge log files!",
                default: false,
            },
            legacyContractDownloader: {
                title: "legacyContractDownloader",
                desc: "When set to true, the official servers will be used for contract downloading in H3, which only works for the platform you are playing on. When false, the HITMAPS servers will be used instead. Note that this option only pertains to H3. Official servers will be used for H1 and H2 regardless of the value of this option.",
                default: false,
            },
            gameplayUnlockAllShortcuts: {
                title: "gameplayUnlockAllShortcuts",
                desc: "When set to true, all shortcuts will always be unlocked.",
                default: false,
            },
            gameplayUnlockAllFreelancerMasteries: {
                title: "gameplayUnlockAllFreelancerMasteries",
                desc: "When set to true, all Freelancer unlocks will always be available.",
                default: false,
            },
            legacyElusivesEnableSaving: {
                title: "legacyElusivesEnableSaving",
                desc: 'When set to true, playing elusive target missions in Hitman 2016 will share the same restarting/replanning/saving rules with normal missions, but the "Elusive Target [Location]" challenges will not be completable. These challenges will only be completable when this option is set to false.',
                default: false,
            },
            mapDiscoveryState: {
                title: "mapDiscoveryState",
                desc: 'Decides what to do with the discovery state of the maps. REVEALED will reset all map locations to discovered, CLOUDED will reset all maps to undiscovered, and KEEP will keep your current discovery state. Note that these actions will take effect every time you connect to Peacock. Your progress of the "Discover [Location]" challenges will not be affected by this option.',
                possibleValues: ["REVEALED", "CLOUDED", "KEEP"],
                default: "KEEP",
            },
            enableMasteryProgression: {
                title: "enableMasteryProgression",
                desc: "When set to false, mastery progression will be disabled and all unlockables will be awarded at the beginning",
                default: true,
            },
            getDefaultSuits: {
                title: "getDefaultSuits",
                desc: `[Gameplay] Set this to true to add all the default starting suits to your inventory. Note: If you set both this and "enableMasteryProgression" to "true" at the same time, a starting suit that is also the unlock for a challenge/mastery will be locked behind its challenge/mastery.`,
                default: false,
            },
        },
    },
}

const FLAGS_FILE = "options.ini"

/**
 * Get a flag from the flag file.
 *
 * @param flagId The flag's name.
 * @returns The flag's value.
 */
export function getFlag(flagId: string): string | boolean | number {
    const { section, flag } = convertFlagId(flagId)

    return (
        (flags[section][flag] as string | boolean | number) ??
        defaultFlags[section][flag].default
    )
}

export function setFlag(
    flagId: string,
    value: string | boolean | number,
): void {
    const { section, flag } = convertFlagId(flagId)

    flags[section][flag] = value
}

function convertFlagId(flagId: string) {
    const splittedFlagId = flagId.split(".")
    const sectionKey =
        splittedFlagId.length === 1 ? "peacock" : splittedFlagId[0]
    const flagKey =
        splittedFlagId.length === 1 ? splittedFlagId[0] : splittedFlagId[1]

    return {
        section: sectionKey,
        flag: flagKey,
    }
}

export function saveFlags() {
    const lines: string[] = []

    Object.keys(defaultFlags).forEach((sectionKey) => {
        const defaultSection = defaultFlags[sectionKey]
        const section = flags[sectionKey]

        lines.push(`; ${defaultSection.title} - ${defaultSection.desc}`)
        lines.push(`[${sectionKey}]`)

        Object.keys(defaultSection.flags).forEach((flagKey) => {
            const defaultFlag = defaultSection.flags[flagKey]
            const flag = section[flagKey]

            lines.push(`; ${defaultFlag.title || flag} - ${defaultFlag.desc}`)
            lines.push(`${flagKey}=${flag}`)
            lines.push("")
        })
    })

    writeFileSync(FLAGS_FILE, lines.join("\n"))
}

/**
 * Loads all flags.
 */
export function loadFlags(): void {
    if (!existsSync(FLAGS_FILE)) {
        writeFileSync(FLAGS_FILE, "")
    }

    // Load the current INI-file
    tempFlags = parse(readFileSync(FLAGS_FILE).toString())

    // Create a new INI-file
    flags = {}

    // Re-create the default flags in the new INI-file, but keep the existing values from the current INI-file.
    // NOTE: This will intentionally drop any non-existing sections/flags!
    Object.keys(defaultFlags).forEach(loadFlagSection)

    log(LogLevel.DEBUG, "Loaded all default flags.")
}

function loadFlagSection(sectionKey: string) {
    flags[sectionKey] = {}

    const defaultFlagKeys = Object.keys(defaultFlags[sectionKey].flags)

    defaultFlagKeys.forEach((flag) => {
        const currentFlagValue = tempFlags[sectionKey]
            ? tempFlags[sectionKey][flag]
            : undefined

        flags[sectionKey][flag] =
            currentFlagValue ?? defaultFlags[sectionKey].flags[flag].default
    })
}

export function registerFlagSection(sectionKey: string, section: FlagSection) {
    defaultFlags[sectionKey] = section

    loadFlagSection(sectionKey)
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
