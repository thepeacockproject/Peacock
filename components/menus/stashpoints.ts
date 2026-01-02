/*
 *     The Peacock Project - a HITMAN server replacement.
 *     Copyright (C) 2021-2026 The Peacock Project Team
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

import { createInventory, getUnlockableById, InventoryItem } from "../inventory"
import type {
    GameVersion,
    JwtData,
    MissionManifest,
    SafehouseCategory,
    UserCentricContract,
} from "../types/types"
import {
    SafehouseCategoryQuery,
    StashpointQuery,
    StashpointQueryH2016,
    StashpointSlotName,
} from "../types/gameSchemas"
import { uuidRegex } from "../utils"
import { controller } from "../controller"
import { generateUserCentric, getSubLocationByName } from "../contracts/dataGen"
import { log, LogLevel } from "../loggingInterop"
import { LOADOUT_SLOTS, loadouts } from "../loadouts"
import assert from "assert"

/**
 * Algorithm to get the stashpoint items data for H2 and H3.
 *
 * @param inventory The user's inventory.
 * @param query The input query for the stashpoint.
 * @param gameVersion
 * @param contractData The optional contract data.
 */
export function getModernStashItemsData(
    inventory: InventoryItem[],
    query: StashpointQuery,
    gameVersion: GameVersion,
    contractData: MissionManifest | undefined,
) {
    let slotname

    if (!uuidRegex.test(query.slotid as string)) {
        slotname = LOADOUT_SLOTS[query.slotid as number]
    } else {
        slotname = "container"
    }

    return inventory
        .filter((item) => {
            if (
                (slotname === "gear" &&
                    contractData?.Peacock?.noGear === true) ||
                (slotname === "concealedweapon" &&
                    contractData?.Peacock?.noCarriedWeapon === true)
            ) {
                return false
            }

            if (
                item.Unlockable.Subtype === "disguise" &&
                gameVersion === "h3"
            ) {
                return false
            }

            return (
                item.Unlockable.Properties.LoadoutSlot && // only display items
                (((slotname === "container" || // container
                    slotname === "stashpoint") && // stashpoint
                    item.Unlockable.Properties.LoadoutSlot !== "disguise") || // container or stashpoint => display all items
                    item.Unlockable.Properties.LoadoutSlot === slotname) && // else: display items for requested slot
                (query.allowcontainers === "true" ||
                    !item.Unlockable.Properties.IsContainer) &&
                (query.allowlargeitems === "true" ||
                    item.Unlockable.Properties.ItemSize === // regular gear slot or hidden stash => small item
                        "ITEMSIZE_SMALL" ||
                    (!item.Unlockable.Properties.ItemSize &&
                        item.Unlockable.Properties.LoadoutSlot !== // use old logic if itemsize is not set
                            "carriedweapon")) &&
                item.Unlockable.Type !== "challengemultiplier" &&
                !item.Unlockable.Properties.InclusionData
            ) // not sure about this one
        })
        .map((item) => ({
            Item: item,
            ItemDetails: {
                Capabilities: [],
                StatList: item.Unlockable.Properties.Gameplay
                    ? Object.entries(item.Unlockable.Properties.Gameplay).map(
                          ([key, value]) => ({
                              Name: key,
                              Ratio: value,
                          }),
                      )
                    : [],
                PropertyTexts: [],
            },
            SlotId: query.slotid,
            SlotName: null,
        }))
}

export type ModernStashData = {
    SlotId: string | number
    LoadoutItemsData: unknown
    UserCentric?: UserCentricContract
    ShowSlotName: string | number
}

/**
 * Algorithm to get the stashpoint data for H2 and H3.
 *
 * @param query The stashpoint query.
 * @param userId
 * @param gameVersion
 * @returns undefined if the query is invalid, or the stash data.
 */
export function getModernStashData(
    query: StashpointQuery,
    userId: string,
    gameVersion: GameVersion,
): ModernStashData {
    let contractData: MissionManifest | undefined = undefined

    if (query.contractid) {
        contractData = controller.resolveContract(query.contractid, gameVersion)
    }

    const inventory = createInventory(
        userId,
        gameVersion,
        getSubLocationByName(
            contractData?.Metadata.Location || "",
            gameVersion,
        ),
        contractData?.Metadata.LocationSuitOverride,
    )

    const stashData: ModernStashData = {
        SlotId: query.slotid!,
        LoadoutItemsData: {
            SlotId: query.slotid,
            Items: getModernStashItemsData(
                inventory,
                query,
                gameVersion,
                contractData,
            ),
            Page: 0,
            HasMore: false,
            HasMoreLeft: false,
            HasMoreRight: false,
            OptionalData: {
                stashpoint: query.stashpoint || "",
                AllowLargeItems: query.allowlargeitems,
                AllowContainers: query.allowcontainers, // ?? true
            },
        },
        ShowSlotName: query.slotname!,
    }

    if (contractData) {
        stashData.UserCentric = generateUserCentric(
            contractData,
            userId,
            gameVersion,
        )
    }

    return stashData
}

/**
 * Algorithm to get the stashpoint items data for H2016.
 *
 * @param inventory The user's inventory.
 * @param slotname The slot name.
 * @param query
 * @param slotid The slot id.
 */
export function getLegacyStashItems(
    inventory: InventoryItem[],
    slotname: StashpointSlotName,
    query: StashpointQueryH2016,
    slotid: number,
) {
    return inventory
        .filter((item) => {
            return (
                item.Unlockable.Properties.LoadoutSlot && // only display items
                (item.Unlockable.Properties.LoadoutSlot === slotname || // display items for requested slot
                    (slotname === "stashpoint" && // else: if stashpoint
                        item.Unlockable.Properties.LoadoutSlot !==
                            "disguise")) && // => display all non-disguise items
                (query.allowlargeitems === "true" ||
                    item.Unlockable.Properties.ItemSize === // regular gear slot or hidden stash => small item
                        "ITEMSIZE_SMALL" ||
                    (!item.Unlockable.Properties.ItemSize &&
                        item.Unlockable.Properties.LoadoutSlot !== // use old logic if itemsize is not set
                            "carriedweapon")) &&
                item.Unlockable.Type !== "challengemultipler" &&
                !item.Unlockable.Properties.InclusionData
            ) // not sure about this one
        })
        .map((item) => ({
            Item: item,
            ItemDetails: {
                Capabilities: [],
                StatList: item.Unlockable.Properties.Gameplay
                    ? Object.entries(item.Unlockable.Properties.Gameplay).map(
                          ([key, value]) => ({
                              Name: key,
                              Ratio: value,
                          }),
                      )
                    : [],
                PropertyTexts: [],
            },
            SlotId: slotid.toString(),
            SlotName: slotname,
        }))
}

/**
 * Algorithm to get the stashpoint data for H2016.
 *
 * @param query The stashpoint query.
 * @param userId
 * @param gameVersion
 */
export function getLegacyStashData(
    query: StashpointQueryH2016,
    userId: string,
    gameVersion: GameVersion,
) {
    if (!query.contractid || !query.slotname) {
        return undefined
    }

    const contractData = controller.resolveContract(
        query.contractid,
        gameVersion,
    )

    if (!contractData) {
        return undefined
    }

    if (!LOADOUT_SLOTS.includes(query.slotname.slice(0, -1))) {
        log(
            LogLevel.ERROR,
            `Unknown slotname in legacy stashpoint: ${query.slotname}`,
        )
        return undefined
    }

    const sublocation = getSubLocationByName(
        contractData.Metadata.Location,
        gameVersion,
    )

    assert.ok(sublocation, "Sublocation not found")

    const inventory = createInventory(
        userId,
        gameVersion,
        sublocation,
        contractData.Metadata.LocationSuitOverride,
    )

    const userCentricContract = generateUserCentric(
        contractData,
        userId,
        gameVersion,
    )

    const loadoutData = loadouts.getLocationLoadout(
        userId,
        gameVersion,
        sublocation,
        contractData.Metadata.LocationSuitOverride,
    )

    return {
        ContractId: query.contractid,
        // the game actually only needs the loadoutdata from the requested slotid, but this is what IOI servers do
        LoadoutData: [...LOADOUT_SLOTS.entries()].map(([slotid, slotname]) => ({
            SlotName: slotname,
            SlotId: slotid.toString(),
            Items: getLegacyStashItems(inventory, slotname, query, slotid),
            Page: 0,
            Recommended: loadoutData.loadout[
                slotid as keyof typeof loadoutData.loadout
            ]
                ? {
                      item: getUnlockableById(
                          loadoutData.loadout[
                              slotid as keyof typeof loadoutData.loadout
                          ]!,
                          gameVersion,
                      ),
                      type: slotname,
                      owned: true,
                  }
                : null,
            HasMore: false,
            HasMoreLeft: false,
            HasMoreRight: false,
            OptionalData:
                slotid === 6
                    ? {
                          stashpoint: query.stashpoint,
                          AllowLargeItems:
                              query.allowlargeitems || !query.stashpoint,
                      }
                    : {},
        })),
        Contract: userCentricContract?.Contract,
        ShowSlotName: query.slotname,
        UserCentric: userCentricContract,
    }
}

export function getSafehouseCategory(
    query: SafehouseCategoryQuery,
    gameVersion: GameVersion,
    jwt: JwtData,
) {
    const inventory = createInventory(jwt.unique_name, gameVersion)

    let safehouseData: SafehouseCategory = {
        Category: "_root",
        SubCategories: [],
        IsLeaf: false,
        Data: null,
    }

    for (const item of inventory) {
        if (query.type) {
            // if type is specified in query
            if (item.Unlockable.Type !== query.type) {
                continue // skip all items that are not that type
            }

            if (query.subtype && item.Unlockable.Subtype !== query.subtype) {
                // if subtype is specified
                continue // skip all items that are not that subtype
            }
        } else if (
            item.Unlockable.Type === "access" ||
            item.Unlockable.Type === "location" ||
            item.Unlockable.Type === "package" ||
            item.Unlockable.Type === "loadoutunlock" ||
            item.Unlockable.Type === "difficultyunlock" ||
            item.Unlockable.Type === "agencypickup" ||
            item.Unlockable.Type === "challengemultiplier" ||
            item.Unlockable.Type === "emote"
        ) {
            continue // these types should not be displayed when not asked for
        } else if (item.Unlockable.Properties.InclusionData) {
            // Only sniper unlockables have inclusion data, don't show them
            continue
        }

        if (item.Unlockable.Subtype === "disguise" && gameVersion === "h3") {
            continue // I don't want to put this in that elif statement
        }

        let category = safehouseData.SubCategories?.find(
            (cat) => cat.Category === item.Unlockable.Type,
        )
        let subcategory: SafehouseCategory | undefined

        if (!category) {
            category = {
                Category: item.Unlockable.Type,
                SubCategories: [],
                IsLeaf: false,
                Data: null,
            }
            safehouseData.SubCategories?.push(category)
        }

        subcategory = category.SubCategories?.find(
            (cat) => cat.Category === item.Unlockable.Subtype,
        )

        if (!subcategory) {
            subcategory = {
                Category: item.Unlockable.Subtype!,
                SubCategories: null,
                IsLeaf: true,
                Data: {
                    Type: item.Unlockable.Type,
                    SubType: item.Unlockable.Subtype,
                    Items: [],
                    Page: 0,
                    HasMore: false,
                },
            }
            category.SubCategories?.push(subcategory!)
        }

        subcategory!.Data?.Items.push({
            Item: item,
            ItemDetails: {
                Capabilities: [],
                // @ts-expect-error It just works. Types are probably wrong somewhere up the chain.
                StatList: item.Unlockable.Properties.Gameplay
                    ? Object.entries(item.Unlockable.Properties.Gameplay).map(
                          ([key, value]) => ({
                              Name: key,
                              Ratio: value,
                          }),
                      )
                    : [],
                PropertyTexts: [],
            },
            Type: item.Unlockable.Type,
            SubType: item.Unlockable.SubType,
        })
    }

    for (const [id, category] of safehouseData.SubCategories?.entries() || []) {
        if (category.SubCategories?.length === 1) {
            // if category only has one subcategory
            safehouseData.SubCategories![id] = category.SubCategories[0] // flatten it
            safehouseData.SubCategories![id].Category = category.Category // but keep the top category's name
        }
    }

    if (safehouseData.SubCategories?.length === 1) {
        // if root has only one subcategory
        safehouseData = safehouseData.SubCategories[0] // flatten it
    }

    return safehouseData
}
