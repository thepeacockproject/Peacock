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

import { getVersionedConfig } from "./configSwizzleManager"
import type { GameVersion, Unlockable } from "./types/types"
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
import { log, LogLevel } from "./loggingInterop"
import { getFlag } from "./flags"
import { UnlockableMasteryData } from "./types/mastery"

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

export function createInventory(
    profileId: string,
    gameVersion: GameVersion,
    entP: string[],
): InventoryItem[] {
    if (inventoryUserCache.has(profileId)) {
        return inventoryUserCache.get(profileId)!
    }

    // Get user data to check on location progression
    const userData = getUserData(profileId, gameVersion)

    // add all unlockables to player's inventory
    const allunlockables = getVersionedConfig<Unlockable[]>(
        "allunlockables",
        gameVersion,
        true,
    ).filter((u) => u.Type !== "location") // locations not in inventory

    let unlockables: Unlockable[] = allunlockables

    if (getFlag("enableMasteryProgression")) {
        const packagedUnlocks: Map<string, boolean> = new Map()

        const challengesUnlockables =
            controller.challengeService.getChallengesUnlockables()

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
                    (acc, unlockable) => {
                        let unlockableChallengeId: string
                        let unlockableMasteryData: UnlockableMasteryData

                        // Handles unlockables that belong to a package or unlocked gear from evergreen
                        if (packagedUnlocks.has(unlockable.Id)) {
                            packagedUnlocks.get(unlockable.Id) &&
                                acc[0].push(unlockable)
                        }

                        // Handles packages
                        else if (unlockable.Type === "package") {
                            for (const pkgUnlockableId of unlockable.Properties
                                .Unlocks) {
                                packagedUnlocks.set(pkgUnlockableId, true)
                            }

                            acc[0].push(unlockable)
                        }

                        // If the unlockable is challenge reward, check if user has the challenge completed
                        else if (
                            (unlockableChallengeId =
                                challengesUnlockables[unlockable.Id])
                        ) {
                            const challenge =
                                userData.Extensions?.ChallengeProgression?.[
                                    unlockableChallengeId
                                ]

                            if (challenge?.Completed) acc[0].push(unlockable)
                        }

                        // If the unlockable is mastery locked, checks if its unlocked based on user location progression
                        else if (
                            (unlockableMasteryData =
                                controller.masteryService.getMasteryForUnlockable(
                                    unlockable,
                                ))
                        ) {
                            const locationData =
                                controller.progressionService.getMasteryProgressionForLocation(
                                    userData,
                                    unlockableMasteryData.Location,
                                )

                            const canUnlock =
                                locationData.Level >=
                                unlockableMasteryData.Level

                            if (canUnlock) {
                                acc[0].push(unlockable)
                            }

                            // If the unlock is an evergreen package, adds its unlockables to the list
                            if (
                                unlockable.Type === "evergreenmastery" &&
                                unlockable.Properties.Unlocks
                            )
                                for (const evergreenGearId of unlockable
                                    .Properties.Unlocks) {
                                    packagedUnlocks.set(
                                        evergreenGearId,
                                        canUnlock,
                                    )
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
                    },
                    [[], []],
                )

        unlockables = [...unlockedItems, ...otherItems]
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
        .filter((unlockContainer) => {
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
        })

    for (const unlockable of filtered) {
        unlockable!.ProfileId = profileId
    }

    inventoryUserCache.set(profileId, filtered)
    return filtered
}

export function awardDropsToUser(profileId: string, drops: Unlockable[]): void {
    if (inventoryUserCache.has(profileId)) {
        const inventoryItems: InventoryItem[] = drops.map((unlockable) => ({
            InstanceId: unlockable.Guid,
            ProfileId: profileId,
            Unlockable: unlockable,
            Properties: {},
        }))
        inventoryUserCache.set(profileId, [
            ...new Set([
                ...inventoryUserCache.get(profileId),
                ...inventoryItems,
            ]),
        ])
    } else {
        /**
         * @TODO Don't think theres a situation where the user doesn't have an inventory, but I may be wrong so leaving this for now.
         * Can delete if unnecessary
         */
        log(LogLevel.DEBUG, "No inventory for provided user")
    }
}

export function getDataForUnlockables(
    gameVersion: GameVersion,
    unlockableIds: string[],
): Unlockable[] {
    return getVersionedConfig<Unlockable[]>(
        "allunlockables",
        gameVersion,
        true,
    ).filter((unlockable) => unlockableIds.includes(unlockable.Id))
}

export function getUnlockableById(
    gameVersion: GameVersion,
    unlockableId: string,
): Unlockable | undefined {
    return getVersionedConfig<Unlockable[]>(
        "allunlockables",
        gameVersion,
        true,
    ).find((unlockable) => unlockable.Id === unlockableId)
}
