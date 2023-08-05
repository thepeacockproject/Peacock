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

import { decode } from "jsonwebtoken"
import type { NextFunction, Response } from "express"
import type {
    GameVersion,
    MissionManifestObjective,
    PeacockLocationsData,
    RepositoryId,
    RequestWithJwt,
    ServerVersion,
    Unlockable,
    UserProfile,
} from "./types/types"
import axios, { AxiosError } from "axios"
import { log, LogLevel } from "./loggingInterop"
import { writeFileSync } from "fs"
import { getFlag } from "./flags"
import { getConfig, getVersionedConfig } from "./configSwizzleManager"

/**
 * True if the server is being run by the launcher, false otherwise.
 */
export const IS_LAUNCHER = process.env.IS_PEACOCK_LAUNCHER === "true"

export const ServerVer: ServerVersion = {
    _Major: 8,
    _Minor: 10,
    _Build: 0,
    _Revision: 0,
}

export const PEACOCKVER = REV_IDENT
export const PEACOCKVERSTRING = HUMAN_VERSION

export const uuidRegex =
    /^[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}$/

export const contractTypes = ["featured", "usercreated"]

export const versions: GameVersion[] = ["h1", "h2", "h3"]

export const contractCreationTutorialId = "d7e2607c-6916-48e2-9588-976c7d8998bb"

/**
 * The latest profile version, this should be changed in conjunction with the updating mechanism.
 *
 * See docs/USER_PROFILES.md for more.
 */
export const LATEST_PROFILE_VERSION = 1

export async function checkForUpdates(): Promise<void> {
    if (getFlag("updateChecking") === false) {
        return
    }

    try {
        const res = await axios(
            "https://backend.rdil.rocks/peacock/latest-version",
        )
        const current = res.data

        if (PEACOCKVER < 0 && current < -PEACOCKVER) {
            log(
                LogLevel.INFO,
                `Thank you for trying out this testing version of Peacock! Please report any bugs by posting in the #help channel on Discord or by submitting an issue on GitHub.`,
            )
        } else if (PEACOCKVER > 0 && current === PEACOCKVER) {
            log(LogLevel.DEBUG, "Peacock is up to date.")
        } else {
            log(
                LogLevel.WARN,
                `Peacock is out-of-date! Check the Discord for the latest release.`,
            )
        }
    } catch (e) {
        log(LogLevel.WARN, "Failed to check for updates!")
    }
}

export function getRemoteService(gameVersion: GameVersion): string {
    return gameVersion === "h3"
        ? "hm3-service"
        : gameVersion === "h2"
        ? "pc2-service"
        : "pc-service"
}

/**
 * Middleware that validates the authentication token sent by the client.
 *
 * @param req The express request object.
 * @param res The express response object.
 * @param next The express next function.
 */
export function extractToken(
    req: RequestWithJwt,
    res?: Response,
    next?: NextFunction,
): void {
    const header = req.header("Authorization")
    const auth = header ? header.split(" ") : []

    if (auth.length === 2 && auth[0].toLowerCase() === "bearer") {
        // @ts-expect-error Type overlap
        req.jwt = <string>decode(auth[1])

        if (!uuidRegex.test(req.jwt.unique_name)) {
            res?.status(424).send("profile appears to be corrupted")
            return
        }

        next?.()
        return
    }

    req.shouldCease = true
    next?.("router")
}

export const DEFAULT_MASTERY_MAXLEVEL = 20
export const XP_PER_LEVEL = 6000

export function getMaxProfileLevel(gameVersion: GameVersion): number {
    if (gameVersion === "h3") {
        return 7500
    }

    return 5000
}

/**
 * Calculates the level for the given XP based on XP_PER_LEVEL.
 * Minimum level returned is 1.
 */
export function levelForXp(xp: number): number {
    return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1)
}

/**
 * Calculates the required XP for the given level based on XP_PER_LEVEL.
 * Minimum XP returned is 0.
 */
export function xpRequiredForLevel(level: number): number {
    return Math.max(0, (level - 1) * XP_PER_LEVEL)
}

// TODO: Determine some mathematical function
export const EVERGREEN_LEVEL_INFO: number[] = [
    0, 5000, 10000, 17000, 24000, 31000, 38000, 45000, 52000, 61000, 70000,
    79000, 88000, 97000, 106000, 115000, 124000, 133000, 142000, 154000, 166000,
    178000, 190000, 202000, 214000, 226000, 238000, 250000, 262000, 280000,
    298000, 316000, 334000, 352000, 370000, 388000, 406000, 424000, 442000,
    468000, 494000, 520000, 546000, 572000, 598000, 624000, 650000, 676000,
    702000, 736000, 770000, 804000, 838000, 872000, 906000, 940000, 974000,
    1008000, 1042000, 1082000, 1122000, 1162000, 1202000, 1242000, 1282000,
    1322000, 1362000, 1402000, 1442000, 1492000, 1542000, 1592000, 1642000,
    1692000, 1742000, 1792000, 1842000, 1892000, 1942000, 2002000, 2062000,
    2122000, 2182000, 2242000, 2302000, 2362000, 2422000, 2482000, 2542000,
    2692000, 2842000, 2992000, 3142000, 3292000, 3442000, 3592000, 3742000,
    3892000, 4042000, 4192000,
]

export function evergreenLevelForXp(xp: number): number {
    for (let i = 1; i < EVERGREEN_LEVEL_INFO.length; i++) {
        if (xp >= EVERGREEN_LEVEL_INFO[i]) {
            continue
        }

        return i
    }

    return 1
}

export function xpRequiredForEvergreenLevel(level: number): number {
    return EVERGREEN_LEVEL_INFO[level - 1]
}

// TODO: Determine some mathematical function
export const SNIPER_LEVEL_INFO: number[] = [
    0, 50000, 150000, 500000, 1000000, 1700000, 2500000, 3500000, 5000000,
    7000000, 9500000, 12500000, 16000000, 20000000, 25000000, 31000000,
    38000000, 47000000, 58000000, 70000000,
]

export function sniperLevelForXp(xp: number): number {
    for (let i = 1; i < SNIPER_LEVEL_INFO.length; i++) {
        if (xp >= SNIPER_LEVEL_INFO[i]) {
            continue
        }

        return i
    }

    return 1
}

/**
 * Get the number of xp needed to reach a level in sniper missions.
 * @param level The level in question.
 * @returns The xp, as a number.
 */
export function xpRequiredForSniperLevel(level: number): number {
    return SNIPER_LEVEL_INFO[level - 1]
}

/**
 * Clamps the given value between a minimum and maximum value
 */
export function clampValue(value: number, min: number, max: number) {
    return Math.max(min, Math.min(value, max))
}

/**
 * Updates a user profile depending on the current version (if any).
 * @param profile The userprofile to update
 * @param gameVersion The game version
 * @returns The updated user profile
 */
function updateUserProfile(
    profile: UserProfile,
    gameVersion: GameVersion,
): void {
    /**
     * This switch is structured such that the current profile version will return.
     * thus stopping the function.
     *
     * As the version number is incremented, the previous version should be added
     * as a case to update it to the newest version.
     */
    switch (profile.Version) {
        case LATEST_PROFILE_VERSION:
            // This profile updated to the latest version, we're done.
            return
        default: {
            // Check that the profile version is indeed undefined. If it isn't,
            // we've forgotten to add a version to the switch.
            if (profile.Version !== undefined) {
                log(
                    LogLevel.ERROR,
                    `Unhandled profile version ${profile.Version}`,
                )
                return
            }

            // Profile has no version, update it to version 1, then re-run
            // the function to update it to subsequent versions.

            const sniperLocs = {
                LOCATION_PARENT_AUSTRIA: [
                    "FIREARMS_SC_HERO_SNIPER_HM",
                    "FIREARMS_SC_HERO_SNIPER_KNIGHT",
                    "FIREARMS_SC_HERO_SNIPER_STONE",
                ],
                LOCATION_PARENT_SALTY: [
                    "FIREARMS_SC_SEAGULL_HM",
                    "FIREARMS_SC_SEAGULL_KNIGHT",
                    "FIREARMS_SC_SEAGULL_STONE",
                ],
                LOCATION_PARENT_CAGED: [
                    "FIREARMS_SC_FALCON_HM",
                    "FIREARMS_SC_FALCON_KNIGHT",
                    "FIREARMS_SC_FALCON_STONE",
                ],
            }

            // We need this to ensure all locations are added.
            const allLocs = Object.keys(
                getVersionedConfig<PeacockLocationsData>(
                    "LocationsData",
                    gameVersion,
                    false,
                ).parents,
            ).map((key) => key.toLocaleLowerCase())

            profile.Extensions.progression.Locations = allLocs.reduce(
                (obj, key) => {
                    const newKey = key.toLocaleUpperCase()
                    const curData =
                        profile.Extensions.progression.Locations[key]

                    if (gameVersion === "h1") {
                        // No sniper locations, but we add normal and pro1
                        obj[newKey] = {
                            // Data from previous profiles only contains normal and is the default.
                            normal: {
                                Xp: curData.Xp ?? 0,
                                Level: curData.Level ?? 1,
                                PreviouslySeenXp: curData.PreviouslySeenXp ?? 0,
                            },
                            pro1: {
                                Xp: 0,
                                Level: 1,
                                PreviouslySeenXp: 0,
                            },
                        }
                    } else {
                        // We need to update sniper locations.
                        obj[newKey] = sniperLocs[newKey]
                            ? sniperLocs[newKey].reduce((obj, uId) => {
                                  obj[uId] = {
                                      Xp: 0,
                                      Level: 1,
                                      PreviouslySeenXp: 0,
                                  }

                                  return obj
                              }, {})
                            : {
                                  Xp: curData.Xp ?? 0,
                                  Level: curData.Level ?? 1,
                                  PreviouslySeenXp:
                                      curData.PreviouslySeenXp ?? 0,
                              }
                    }

                    return obj
                },
                {},
            )

            delete profile.Extensions.progression["Unlockables"]

            profile.Version = 1

            return updateUserProfile(profile, gameVersion)
        }
    }
}

/**
 * Returns whether a location is a sniper location. Works for both parent and child locations.
 * @param location The location ID string.
 * @returns A boolean denoting the result.
 */
export function isSniperLocation(location: string): boolean {
    return (
        location.includes("AUSTRIA") ||
        location.includes("SALTY") ||
        location.includes("CAGED")
    )
}

export function castUserProfile(
    profile: UserProfile,
    gameVersion: GameVersion,
    path?: string,
): UserProfile {
    const j = fastClone(profile)

    if (!j.Extensions || Object.keys(j.Extensions).length === 0) {
        log(LogLevel.DEBUG, "No extensions - skipping validation")
        return j
    }

    let dirty = false

    for (const item of [
        "PeacockEscalations",
        "PeacockFavoriteContracts",
        "PeacockPlayedContracts",
        "PeacockCompletedEscalations",
        "CPD",
    ]) {
        if (!Object.prototype.hasOwnProperty.call(j.Extensions, item)) {
            log(LogLevel.DEBUG, `Err missing property ${item}`)
            log(
                LogLevel.WARN,
                `A requested user profile is missing some vital data.`,
            )
            log(
                LogLevel.WARN,
                `Attempting to repair the profile automatically...`,
            )

            if (item === "PeacockEscalations") {
                j.Extensions.PeacockEscalations = {}
            }

            if (item === "PeacockCompletedEscalations") {
                j.Extensions.PeacockCompletedEscalations = []
            }

            if (item === "PeacockFavoriteContracts") {
                j.Extensions.PeacockFavoriteContracts = []
            }

            if (item === "CPD") {
                j.Extensions.CPD = {}
            }

            if (item === "PeacockPlayedContracts") {
                j.Extensions.PeacockPlayedContracts = {}
            }

            dirty = true
        }
    }

    // Fix Extensions.gamepersistentdata.HitsFilterType.
    // None of the old profiles should have "MyPlaylist".
    if (
        !Object.prototype.hasOwnProperty.call(
            j.Extensions.gamepersistentdata.HitsFilterType,
            "MyPlaylist",
        )
    ) {
        j.Extensions.gamepersistentdata.HitsFilterType = {
            MyHistory: "all",
            MyContracts: "all",
            MyPlaylist: "all",
        }
    }

    if (j.Extensions?.gamepersistentdata?.PersistentBool) {
        switch (getFlag("mapDiscoveryState")) {
            case "REVEALED":
                {
                    const areas = Object.keys(getConfig("AreaMap", false))

                    for (const area of areas) {
                        j.Extensions.gamepersistentdata.PersistentBool[area] =
                            true
                    }
                }

                break
            case "CLOUDED":
                j.Extensions.gamepersistentdata.PersistentBool = {
                    __Full:
                        j.Extensions.gamepersistentdata.PersistentBool
                            ?.__Full ?? {},
                }
                break
        }
    }

    if (j.Version !== LATEST_PROFILE_VERSION) {
        // This profile is not the latest version. We must update it.
        log(LogLevel.DEBUG, `Profile is outdated, updating...`)
        updateUserProfile(j, gameVersion)
        dirty = true
    }

    if (dirty) {
        writeFileSync(path ?? `userdata/users/${j.Id}.json`, JSON.stringify(j))
        log(LogLevel.INFO, "Profile successfully repaired!")
    }

    return j
}

export const defaultSuits = {
    LOCATION_PARENT_ICA_FACILITY: "TOKEN_OUTFIT_GREENLAND_HERO_TRAININGSUIT",
    LOCATION_PARENT_PARIS: "TOKEN_OUTFIT_PARIS_HERO_PARISSUIT",
    LOCATION_PARENT_COASTALTOWN: "TOKEN_OUTFIT_SAPIENZA_HERO_SAPIENZASUIT",
    LOCATION_COASTALTOWN_MOVIESET:
        "TOKEN_OUTFIT_SAPIENZA_HERO_SAPIENZASUIT_NOGLASSES",
    LOCATION_COASTALTOWN_EBOLA:
        "TOKEN_OUTFIT_SAPIENZA_HERO_SAPIENZASUIT_NOGLASSES",
    LOCATION_PARENT_MARRAKECH: "TOKEN_OUTFIT_MARRAKESH_HERO_MARRAKESHSUIT",
    LOCATION_PARENT_BANGKOK: "TOKEN_OUTFIT_BANGKOK_HERO_BANGKOKSUIT",
    LOCATION_PARENT_COLORADO: "TOKEN_OUTFIT_COLORADO_HERO_COLORADOSUIT",
    LOCATION_PARENT_HOKKAIDO: "TOKEN_OUTFIT_HOKKAIDO_HERO_HOKKAIDOSUIT",
    LOCATION_PARENT_NEWZEALAND: "TOKEN_OUTFIT_WET_SUIT",
    LOCATION_PARENT_MIAMI: "TOKEN_OUTFIT_MIAMI_HERO_MIAMISUIT",
    LOCATION_PARENT_COLOMBIA: "TOKEN_OUTFIT_COLOMBIA_HERO_COLOMBIASUIT",
    LOCATION_PARENT_MUMBAI: "TOKEN_OUTFIT_MUMBAI_HERO_MUMBAISUIT",
    LOCATION_PARENT_NORTHAMERICA:
        "TOKEN_OUTFIT_NORTHAMERICA_HERO_NORTHAMERICASUIT",
    LOCATION_PARENT_NORTHSEA: "TOKEN_OUTFIT_NORTHSEA_HERO_NORTHSEASUIT",
    LOCATION_PARENT_GREEDY: "TOKEN_OUTFIT_GREEDY_HERO_GREEDYSUIT",
    LOCATION_PARENT_OPULENT: "TOKEN_OUTFIT_OPULENT_HERO_OPULENTSUIT",
    LOCATION_PARENT_GOLDEN: "TOKEN_OUTFIT_HERO_GECKO_SUIT",
    LOCATION_PARENT_ANCESTRAL: "TOKEN_OUTFIT_ANCESTRAL_HERO_ANCESTRALSUIT",
    LOCATION_ANCESTRAL_SMOOTHSNAKE:
        "TOKEN_OUTFIT_ANCESTRAL_HERO_SMOOTHSNAKESUIT",
    LOCATION_PARENT_EDGY: "TOKEN_OUTFIT_EDGY_HERO_EDGYSUIT",
    LOCATION_PARENT_WET: "TOKEN_OUTFIT_WET_HERO_WETSUIT",
    LOCATION_PARENT_ELEGANT: "TOKEN_OUTFIT_ELEGANT_HERO_LLAMASUIT",
    LOCATION_PARENT_TRAPPED: "TOKEN_OUTFIT_TRAPPED_WOLVERINE_SUIT",
    LOCATION_PARENT_ROCKY: "TOKEN_OUTFIT_HERO_DUGONG_SUIT",
}

/**
 * Default suits that are attainable via challenges or mastery in this version.
 * NOTE: Currently this is hardcoded. To allow for flexibility and extensibility, this should be generated in real-time
 * using the Drops of challenges and masteries. However, that would require looping through all challenges and masteries
 * for all default suits, which is slow. This is a trade-off.
 * @param   gameVersion The game version.
 * @returns  The default suits that are attainable via challenges or mastery.
 */
export function attainableDefaults(gameVersion: GameVersion): string[] {
    return gameVersion === "h1"
        ? []
        : gameVersion === "h2"
        ? ["TOKEN_OUTFIT_WET_SUIT"]
        : [
              "TOKEN_OUTFIT_GREENLAND_HERO_TRAININGSUIT",
              "TOKEN_OUTFIT_WET_SUIT",
              "TOKEN_OUTFIT_HERO_DUGONG_SUIT",
          ]
}

/**
 * Gets the default suit for a given sub-location and parent location.
 * Priority is given to the sub-location, then the parent location, then 47's signature suit.
 * @param subLocation The sub-location.
 * @returns The default suit for the given sub-location and parent location.
 */
export function getDefaultSuitFor(subLocation: Unlockable) {
    return (
        defaultSuits[subLocation.Id] ||
        defaultSuits[subLocation.Properties.ParentLocation] ||
        "TOKEN_OUTFIT_HITMANSUIT"
    )
}

export const nilUuid = "00000000-0000-0000-0000-000000000000"

export const hitmapsUrl = "https://backend.rdil.rocks/partners/hitmaps/contract"

export function isObjectiveActive(
    objective: MissionManifestObjective,
    doneObjectives: Set<RepositoryId>,
): boolean {
    if (objective.Activation !== undefined) {
        if (Array.isArray(objective.Activation.$eq)) {
            return (
                objective.Activation.$eq[1] === "Completed" &&
                doneObjectives.has(
                    (<string>objective.Activation.$eq[0]).substring(1),
                )
            )
        }
    }

    return false
}

export const jokes = [
    "STILL... we are close now, 47.",
    "James Batty, the plaintiff, wants Janus to stop his annual landing of a helicopter, near the local creek.",
    "Searching for local masons in your area...",
    "I wonder what kind of curry currymaker makes",
    "Listening for uncommon guard voice lines...",
    "Mistah Jason Portman, please come to the hospital entrance. A doctor will escort you to your checkup. That was for: mistah Jason Portman.",
    "Nakamura-San, please come to the operating theatre. Stat.",
    "Ugh, my knee is so sore.",
    "Mister Prichard I presume? Hi, I'm Chen Ting. Pleasure to meet you.",
    "Find your inner... zen",
    "I love those little drones when they scoot around like that.",
    "Welcome, welcome! Hello! Good to see you. So lovely to see so many familiar faces here today.",
    "hi so i own hitman 1 and 2 i got hitman 1 and 2 on disc hitman 1 def edition and hitman 2 gold disc both on ps4 and when i got hitman 2 i downloaded the best legesy pack and all of my saves are on hitman 2 but i got rid of that game will i need both of them to get all the levels onto hitman 3 and im staying on ps4",
    "The weather is always nice in Paris.",
    "Have you seen a girl around? Short hair, with a bright green bag?",
    "The show is just about to start.",
    "Entering the Ether lab requires a uniform and a keycard... luckily, it seems both are within reach.",
    "Welcome to Bangkok, 47. The target has been in residence at the hotel for almost a month and security is tight, with several other high-profile guests also at the hotel. Good Hunting.",
]

/**
 * The current game difficulty.
 */
export const gameDifficulty = {
    /**
     * The game isn't on a set difficulty (missions with no difficulties data?).
     */
    unset: 0,
    /**
     * Casual mode.
     */
    casual: 1,
    easy: 1,
    /**
     * Professional (normal) mode.
     */
    normal: 2,
    /**
     * Master mode.
     */
    master: 4,
    hard: 4,
} as const

export function difficultyToString(difficulty: number): string {
    switch (difficulty) {
        case 1:
            return "casual"
        case 2:
            return "normal"
        case 4:
            return "master"
        case 0:
        default:
            return "unset"
    }
}

/**
 * Handle an {@link AxiosError} from axios.
 *
 * @see https://axios-http.com/docs/handling_errors
 * @param error The error from axios.
 */
export function handleAxiosError(error: AxiosError): void {
    if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        log(LogLevel.DEBUG, `code ${error.response.status}`)
    } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of http.ClientRequest
        log(LogLevel.DEBUG, `bad fetch`)
    } else {
        // Something happened in setting up the request that triggered an Error
        log(LogLevel.DEBUG, `generic`)
    }
}

export function unlockOrderComparer(a: Unlockable, b: Unlockable): number {
    return (
        (a?.Properties?.UnlockOrder ?? Number.POSITIVE_INFINITY) -
            (b?.Properties?.UnlockOrder ?? Number.POSITIVE_INFINITY) || 0
    )
}

/**
 * Converts a contract's public ID as a long-form number into the version with dashes.
 *
 * @param publicId The ID without dashes.
 * @returns The ID with dashes.
 */
export function addDashesToPublicId(publicId: string): string {
    if (publicId.includes("-")) {
        // this work is already done
        return publicId
    }

    let id = publicId
    id = id.slice(0, 1) + "-" + id.slice(1)
    id = id.slice(0, 4) + "-" + id.slice(4)
    id = id.slice(0, 12) + "-" + id.slice(12)
    return id
}

/**
 * A fast implementation of deep object cloning.
 *
 * @param item The item to clone.
 * @returns The new item.
 */
export function fastClone<T>(item: T): T {
    return structuredClone(item)
}

/**
 * Returns if the specified repository ID is a suit.
 *
 * @param repoId The repository ID.
 * @returns If the repository ID points to a suit.
 */
export function isSuit(repoId: string): boolean {
    const suitsToTypeMap: Record<string, string> = {}

    const unlockablesFiltered = getConfig<readonly Unlockable[]>(
        "allunlockables",
        false,
    ).filter((unlockable) => unlockable.Type === "disguise")

    for (const u of unlockablesFiltered) {
        suitsToTypeMap[u.Properties.RepositoryId] = u.Subtype
    }

    return suitsToTypeMap[repoId]
        ? suitsToTypeMap[repoId] !== "disguise"
        : false
}
