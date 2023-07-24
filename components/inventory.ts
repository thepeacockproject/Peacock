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

import { getConfig, getVersionedConfig } from "./configSwizzleManager"
import type { GameVersion, Unlockable, UserProfile } from "./types/types"
import {
    brokenItems,
    CONCRETEART_UNLOCKABLES,
    DELUXE_UNLOCKABLES,
    EXECUTIVE_UNLOCKABLES,
    H1_GOTY_UNLOCKABLES,
    H1_REQUIEM_UNLOCKABLES,
    H2_RACCOON_STINGRAY_UNLOCKABLES,
    MAKESHIFT_UNLOCKABLES,
    SIN_ENVY_UNLOCKABLES,
    SIN_GLUTTONY_UNLOCKABLES,
    SIN_GREED_UNLOCKABLES,
    SIN_LUST_UNLOCKABLES,
    SIN_PRIDE_UNLOCKABLES,
    SIN_SLOTH_UNLOCKABLES,
    SIN_WRATH_UNLOCKABLES,
    TRINITY_UNLOCKABLES,
    WINTERSPORTS_UNLOCKABLES,
} from "./ownership"
import { EPIC_NAMESPACE_2016 } from "./platformEntitlements"
import { controller } from "./controller"
import { getUserData } from "./databaseHandler"
import assert from "assert"
import { getFlag } from "./flags"
import { UnlockableMasteryData } from "./types/mastery"
import { attainableDefaults, defaultSuits, getDefaultSuitFor } from "./utils"
import { log, LogLevel } from "./loggingInterop"

const DELUXE_DATA = [
    ...CONCRETEART_UNLOCKABLES,
    ...DELUXE_UNLOCKABLES,
    ...EXECUTIVE_UNLOCKABLES,
    ...H1_GOTY_UNLOCKABLES,
    ...H1_REQUIEM_UNLOCKABLES,
    ...H2_RACCOON_STINGRAY_UNLOCKABLES,
    ...MAKESHIFT_UNLOCKABLES,
    ...SIN_ENVY_UNLOCKABLES,
    ...SIN_GLUTTONY_UNLOCKABLES,
    ...SIN_GREED_UNLOCKABLES,
    ...SIN_LUST_UNLOCKABLES,
    ...SIN_PRIDE_UNLOCKABLES,
    ...SIN_SLOTH_UNLOCKABLES,
    ...SIN_WRATH_UNLOCKABLES,
    ...TRINITY_UNLOCKABLES,
    ...WINTERSPORTS_UNLOCKABLES,
]

/**
 * An inventory item.
 */
export interface InventoryItem {
    InstanceId: string
    ProfileId: string
    Unlockable: Unlockable
    Properties: Record<string, string>
}

// TODO: What is the overhead of storing inventory objects vs IDs?
const inventoryUserCache: Map<string, InventoryItem[]> = new Map()

/**
 * Clears a user's inventory.
 *
 * @param userId The user's ID.
 */
export function clearInventoryFor(userId: string): void {
    inventoryUserCache.delete(userId)
}

/**
 * Clears the entire inventory cache.
 */
export function clearInventoryCache(): void {
    inventoryUserCache.clear()
}

/**
 * Filters unlocked unlockables
 *
 * @param userProfile The user's profile.
 * @param packagedUnlocks Map of unlockable items that can be available for the user. Each item has the unlockable ID as the key and its unlocked status as the value.
 * @param challengesUnlockables Object that maps Unlockable IDs to the IDs of the challenges that, when completed, will unlock them.
 * @param gameVersion The game version to get the unlockables for
 * @returns Returns a function that, when executed, will produce a pair of arrays. The first array contains all unlocked content, and the second array includes items that are not tracked to corresponding challenges and are available for the user to unlock.
 */
function filterUnlockedContent(
    userProfile: UserProfile,
    packagedUnlocks: Map<string, boolean>,
    challengesUnlockables: object,
    gameVersion: GameVersion,
) {
    return function (
        acc: [Unlockable[], Unlockable[]],
        unlockable: Unlockable,
    ) {
        let unlockableChallengeId: string
        let unlockableMasteryData: UnlockableMasteryData

        // Handles unlockables that belong to a package or unlocked gear from evergreen
        if (packagedUnlocks.has(unlockable.Id)) {
            packagedUnlocks.get(unlockable.Id) && acc[0].push(unlockable)
        }

        // Handles packages
        else if (unlockable.Type === "package") {
            for (const pkgUnlockableId of unlockable.Properties.Unlocks) {
                packagedUnlocks.set(pkgUnlockableId, true)
            }

            acc[0].push(unlockable)
        }

        // If the unlockable is challenge reward, check if user has the challenge completed
        else if (
            (unlockableChallengeId = challengesUnlockables[unlockable.Id])
        ) {
            const challenge =
                userProfile.Extensions?.ChallengeProgression?.[
                    unlockableChallengeId
                ]

            if (challenge?.Completed) acc[0].push(unlockable)
        }

        // If the unlockable is mastery locked, checks if its unlocked based on user location progression
        else if (
            (unlockableMasteryData =
                controller.masteryService.getMasteryForUnlockable(
                    unlockable,
                    gameVersion,
                ))
        ) {
            const locationData =
                controller.progressionService.getMasteryProgressionForLocation(
                    userProfile,
                    unlockableMasteryData.Location,
                    unlockableMasteryData.SubPackageId,
                )

            const canUnlock = locationData.Level >= unlockableMasteryData.Level

            if (canUnlock && unlockable.Type !== "evergreenmastery") {
                acc[0].push(unlockable)
            }

            // If the unlock is an evergreen package, adds its unlockables to the list
            if (
                unlockable.Type === "evergreenmastery" &&
                unlockable.Properties.Unlocks
            )
                for (const evergreenGearId of unlockable.Properties.Unlocks) {
                    packagedUnlocks.set(evergreenGearId, canUnlock)
                }
        } else {
            const isEvergreen =
                unlockable.Type === "evergreenmastery" ||
                unlockable.Subtype === "evergreen"
            const isDeluxe = DELUXE_DATA.includes(unlockable.Id)

            if (isEvergreen || isDeluxe) {
                acc[0].push(unlockable)
            } else {
                /**
                 *  List of untracked items (to award to user until they are tracked to corresponding challenges)
                 */
                acc[1].push(unlockable)
            }
        }

        return acc
    }
}

/**
 * Filters allowed unlockables
 *
 * @param gameVersion
 * @param entP
 * @returns boolean
 */
function filterAllowedContent(gameVersion: GameVersion, entP: string[]) {
    return function (unlockContainer: {
        InstanceId: string
        ProfileId: string
        Unlockable: Unlockable
        Properties: object
    }) {
        if (!unlockContainer) {
            return false
        }

        if (
            unlockContainer.Unlockable.Type === "disguise" &&
            !unlockContainer.Unlockable.Properties.OrderIndex
        ) {
            return false
        }

        if (gameVersion === "h1") {
            return true
        }

        const e = entP
        const { Id: id } = unlockContainer!.Unlockable

        if (!e) {
            return false
        }

        if (unlockContainer.Unlockable.Type === "evergreenmastery") {
            return false
        }

        // This way of doing entitlements is a mess, redo this! - AF
        if (gameVersion === "h3") {
            if (WINTERSPORTS_UNLOCKABLES.includes(id)) {
                return (
                    e.includes("afa4b921503f43339c360d4b53910791") ||
                    e.includes("84a1a6fda4fb48afbb78ee9b2addd475") || // WoA Deluxe
                    e.includes("1829590")
                )
            }

            if (EXECUTIVE_UNLOCKABLES.includes(id)) {
                return (
                    e.includes("6408de14f7dc46b9a33adcf6cbc4d159") ||
                    e.includes("afa4b921503f43339c360d4b53910791") ||
                    e.includes("84a1a6fda4fb48afbb78ee9b2addd475") || // WoA Deluxe
                    e.includes("1829590")
                )
            }

            if (H1_REQUIEM_UNLOCKABLES.includes(id)) {
                return (
                    e.includes("e698e1a4b63947b0bc9349a5ae2dc015") ||
                    e.includes("a3509775467d4d6a8a7adffe518dc204") || // WoA Standard
                    e.includes("1843460")
                )
            }

            if (H1_GOTY_UNLOCKABLES.includes(id)) {
                return (
                    e.includes("894d1e6771044f48a8fdde934b8e443a") ||
                    e.includes("a3509775467d4d6a8a7adffe518dc204") || // WoA Standard
                    e.includes("1843460") ||
                    e.includes("1829595")
                )
            }

            if (H2_RACCOON_STINGRAY_UNLOCKABLES.includes(id)) {
                return (
                    e.includes("afa4b921503f43339c360d4b53910791") ||
                    e.includes("84a1a6fda4fb48afbb78ee9b2addd475") || // WoA Deluxe
                    e.includes("1829590")
                )
            }
        } else if (gameVersion === "h2") {
            if (WINTERSPORTS_UNLOCKABLES.includes(id)) {
                return e.includes("957693")
            }
        } else if (
            // @ts-expect-error The types do actually overlap, but there is no way to show that.
            gameVersion === "h1" &&
            (e.includes("0a73eaedcac84bd28b567dbec764c5cb") ||
                e.includes(EPIC_NAMESPACE_2016))
        ) {
            // h1 EGS
            if (
                H1_REQUIEM_UNLOCKABLES.includes(id) ||
                H1_GOTY_UNLOCKABLES.includes(id)
            ) {
                return e.includes("81aecb49a60b47478e61e1cbd68d63c5")
            }
        }

        if (DELUXE_UNLOCKABLES.includes(id)) {
            return (
                e.includes("bc610b36c75442299edcbe99f6f0fb60") ||
                e.includes("84a1a6fda4fb48afbb78ee9b2addd475") || // WoA Deluxe
                e.includes("1829591")
            )
        }

        /*
        TODO: Fix this entitlement check (confirmed its broken with Blazer)
        if (LEGACY_UNLOCKABLES.includes(id)) {
            return (
                e.includes("0b59243cb8aa420691b66be1ecbe68c0") ||
                e.includes("1829593")
            )
        }
         */

        if (SIN_GREED_UNLOCKABLES.includes(id)) {
            return (
                e.includes("0e8632b4cdfb415e94291d97d727b98d") ||
                e.includes("84a1a6fda4fb48afbb78ee9b2addd475") || // WoA Deluxe
                e.includes("1829580")
            )
        }

        if (SIN_PRIDE_UNLOCKABLES.includes(id)) {
            return (
                e.includes("3f9adc216dde44dda5e829f11740a0a2") ||
                e.includes("84a1a6fda4fb48afbb78ee9b2addd475") || // WoA Deluxe
                e.includes("1829581")
            )
        }

        if (SIN_SLOTH_UNLOCKABLES.includes(id)) {
            return (
                e.includes("aece009ff59441c0b526f8aa69e24cfb") ||
                e.includes("84a1a6fda4fb48afbb78ee9b2addd475") || // WoA Deluxe
                e.includes("1829582")
            )
        }

        if (SIN_LUST_UNLOCKABLES.includes(id)) {
            return (
                e.includes("dfe5aeb89976450ba1e0e2c208b63d33") ||
                e.includes("84a1a6fda4fb48afbb78ee9b2addd475") || // WoA Deluxe
                e.includes("1829583")
            )
        }

        if (SIN_GLUTTONY_UNLOCKABLES.includes(id)) {
            return (
                e.includes("30107bff80024d1ab291f9cd3bac9fac") ||
                e.includes("84a1a6fda4fb48afbb78ee9b2addd475") || // WoA Deluxe
                e.includes("1829584")
            )
        }

        if (SIN_ENVY_UNLOCKABLES.includes(id)) {
            return (
                e.includes("0403062df0d347619c8dcf043c65c02e") ||
                e.includes("84a1a6fda4fb48afbb78ee9b2addd475") || // WoA Deluxe
                e.includes("1829585")
            )
        }

        if (SIN_WRATH_UNLOCKABLES.includes(id)) {
            return (
                e.includes("9e936ed2507a473db6f53ad24d2da587") ||
                e.includes("84a1a6fda4fb48afbb78ee9b2addd475") || // WoA Deluxe
                e.includes("1829586")
            )
        }

        if (TRINITY_UNLOCKABLES.includes(id)) {
            return (
                e.includes("5d06a6c6af9b4875b3530d5328f61287") ||
                e.includes("1829596")
            )
        }

        // The following two must be confirmed, epic entitlements may be in the wrong order! - AF
        if (MAKESHIFT_UNLOCKABLES.includes(id)) {
            return (
                e.includes("08d2bc4d20754191b6c488541d2b4fa1") ||
                e.includes("2184791")
            )
        }

        if (CONCRETEART_UNLOCKABLES.includes(id)) {
            return (
                e.includes("a1e9a63fa4f3425aa66b9b8fa3c9cc35") ||
                e.includes("2184790")
            )
        }

        return true
    }
}

/**
 * We use maps here instead of objects because we don't want V8 to fall back to
 * slow property lookups.
 */
const caches: Record<GameVersion, Map<string, Unlockable>> = {
    scpc: new Map<string, Unlockable>(),
    h1: new Map<string, Unlockable>(),
    h2: new Map<string, Unlockable>(),
    h3: new Map<string, Unlockable>(),
}

/**
 * Get an unlockable by its ID, lazy-loading the unlockable cache if necessary.
 *
 * @param id The unlockable's ID.
 * @param gameVersion The current game version.
 * @see getUnlockablesById
 */
export function getUnlockableById(
    id: string,
    gameVersion: GameVersion,
): Unlockable | undefined {
    if (caches[gameVersion].size === 0) {
        // no data is loaded yet (to save memory), so load it now
        let unlockables = getVersionedConfig<readonly Unlockable[]>(
            "allunlockables",
            gameVersion,
            false,
        )

        if (["h2", "h3"].includes(gameVersion)) {
            unlockables = [
                ...unlockables,
                ...getConfig<readonly Unlockable[]>("SniperUnlockables", false),
            ]
        }

        for (const unlockable of unlockables) {
            caches[gameVersion].set(unlockable.Id, unlockable)
        }

        log(
            LogLevel.DEBUG,
            `Lazy-loaded ${unlockables.length} unlockables for ${gameVersion}`,
        )
    }

    return caches[gameVersion].get(id)
}

/**
 * Multi-getter for unlockables.
 *
 * @param ids The unlockable IDs to get.
 * @param gameVersion The current game version.
 * @see getUnlockableById
 */
export function getUnlockablesById(
    ids: string[],
    gameVersion: GameVersion,
): (Unlockable | undefined)[] {
    return ids.map((id) => getUnlockableById(id, gameVersion))
}

/**
 * Given an inventory and a sublocation, returns a new inventory with
 * the default suit for the sublocation added if it is not already present.
 * If the sublocation is undefined, the inputted inventory is returned.
 * Otherwise, a new inventory is cloned, appended with the default suit, and returned.
 * Either way, the inputted inventory is not modified.
 *
 * @param profileId The profileId of the player
 * @param gameVersion The game version
 * @param inv The inventory to update
 * @param sublocation The sublocation to check for a default suit
 * @returns The updated inventory
 */
function updateWithDefaultSuit(
    profileId: string,
    gameVersion: GameVersion,
    inv: InventoryItem[],
    sublocation: Unlockable,
): InventoryItem[] {
    if (sublocation === undefined) {
        return inv
    }

    // We need to add a suit, so need to copy the cache to prevent modifying it.
    const newInv = [...inv]

    // Yes this is slow. We should organize the unlockables into a { [Id: string]: Unlockable } map.
    const locationSuit = getUnlockableById(
        getDefaultSuitFor(sublocation),
        gameVersion,
    )

    // check if any inventoryItem's unlockable is the default suit for the sublocation
    if (newInv.every((i) => i.Unlockable.Id !== locationSuit.Id)) {
        // if not, add it
        newInv.push({
            InstanceId: locationSuit.Guid,
            ProfileId: profileId,
            Unlockable: locationSuit,
            Properties: {},
        })
    }

    return newInv
}

/**
 * Generate a player's inventory with unlockables.
 * @param profileId  The profile ID of the player
 * @param gameVersion  The game version
 * @param sublocation  The sublocation to generate the inventory for. Used to award default suits for the sublocation. Defaulted to undefined.
 * @returns The player's inventory
 */
export function createInventory(
    profileId: string,
    gameVersion: GameVersion,
    sublocation = undefined,
): InventoryItem[] {
    if (inventoryUserCache.has(profileId)) {
        return updateWithDefaultSuit(
            profileId,
            gameVersion,
            inventoryUserCache.get(profileId)!,
            sublocation,
        )
    }

    // Get user data to check on location progression
    const userProfile = getUserData(profileId, gameVersion)

    // add all unlockables to player's inventory
    const allunlockables = [
        ...getVersionedConfig<Unlockable[]>(
            "allunlockables",
            gameVersion,
            true,
        ),
        ...getConfig<Unlockable[]>("SniperUnlockables", true),
    ].filter((u) => u.Type !== "location") // locations not in inventory

    let unlockables: Unlockable[] = allunlockables

    if (getFlag("enableMasteryProgression")) {
        const packagedUnlocks: Map<string, boolean> = new Map()

        const challengesUnlockables =
            controller.challengeService.getChallengesUnlockables(gameVersion)

        /**
         * Separates unlockable types and lookup for progression level
         * on unlockables that are locked behind mastery progression level
         */
        const [unlockedItems, otherItems]: [Unlockable[], Unlockable[]] =
            allunlockables
                // Sorts packages and evergreen gear wrappers first, so related unlockables can be targeted after
                .sort((_, b) =>
                    b.Type === "package" ||
                    (b.Type === "evergreenmastery" && b.Properties.Unlocks)
                        ? 1
                        : -1,
                )
                .reduce(
                    filterUnlockedContent(
                        userProfile,
                        packagedUnlocks,
                        challengesUnlockables,
                        gameVersion,
                    ),
                    [[], []],
                )

        unlockables = [...unlockedItems, ...otherItems]
    }

    // If getDefaultSuits is turned off, then only give attainable suits and lock everything else.
    // The mastery check has already locked any unattained attainable suits,
    // and location-wide default suits will be given afterwards.
    const defaults = Object.values(defaultSuits)

    if ((getFlag("getDefaultSuits") as boolean) === false) {
        unlockables = unlockables.filter(
            (u) =>
                !defaults.includes(u.Id) ||
                attainableDefaults(gameVersion).includes(u.Id),
        )
    }

    // ts-expect-error It cannot be undefined.
    const filtered: InventoryItem[] = unlockables
        .map((unlockable) => {
            if (brokenItems.includes(unlockable.Guid)) {
                return undefined
            }

            if (unlockable.Guid === "1efe1010-4fff-4ee2-833e-7c58b6518e3e") {
                unlockable.Properties.Name =
                    "char_reward_hero_halloweenoutfit_m_pro140008_name_ebf1e362-671f-47e8-8c88-dd490d8ad866"
                unlockable.Properties.Description =
                    "char_reward_hero_halloweenoutfit_m_pro140008_description_ebf1e362-671f-47e8-8c88-dd490d8ad866"
            }

            unlockable.GameAsset = null
            unlockable.DisplayNameLocKey = `UI_${unlockable.Id}_NAME`
            return {
                InstanceId: unlockable.Guid,
                ProfileId: profileId,
                Unlockable: unlockable,
                Properties: {},
            }
        })
        // filter again, this time removing legacy unlockables
        .filter(filterAllowedContent(gameVersion, userProfile.Extensions.entP))

    for (const unlockable of filtered) {
        unlockable!.ProfileId = profileId
    }

    inventoryUserCache.set(profileId, filtered)

    // It is highly unlikely that we need to add a suit but we don't have the inventory in cache, but just in case
    return updateWithDefaultSuit(profileId, gameVersion, filtered, sublocation)
}

export function grantDrops(profileId: string, drops: Unlockable[]): void {
    if (!inventoryUserCache.has(profileId)) {
        assert.fail(`User ${profileId} does not have an inventory??!`)
    }

    const inventoryItems: InventoryItem[] = drops.map((unlockable) => ({
        InstanceId: unlockable.Guid,
        ProfileId: profileId,
        Unlockable: unlockable,
        Properties: {},
    }))

    inventoryUserCache.set(profileId, [
        ...new Set([
            ...inventoryUserCache.get(profileId),
            ...inventoryItems.filter(
                (invItem) => invItem.Unlockable.Type !== "evergreenmastery",
            ),
        ]),
    ])
}
