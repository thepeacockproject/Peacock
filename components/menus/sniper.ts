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

import { controller } from "../controller"
import type {
    CompletionData,
    GameVersion,
    MissionManifest,
} from "../types/types"
import { getSubLocationByName } from "../contracts/dataGen"
import { InventoryItem } from "../inventory"
import assert from "assert"
import { getFlag } from "../flags"

export type SniperCharacter = {
    Id: string
    Loadout: SniperLoadout
    CompletionData: CompletionData
}

export type SniperLoadout = {
    LoadoutData: {
        SlotId: string
        SlotName: string
        Items: {
            Item: InventoryItem
            ItemDetails: unknown
        }[]
        Page: number
        Recommended: {
            item: InventoryItem
            type: string
            owned: boolean
        }
        HasMore: boolean
        HasMoreLeft: boolean
        HasMoreRight: boolean
        OptionalData: Record<never, never>
    }[]
    LimitedLoadoutUnlockLevel: number | undefined
}

type Return = (SniperLoadout | SniperCharacter)[]

/**
 * Creates the sniper loadouts data for a contract. Returns loadouts for all three
 * characters because multiplayer and singleplayer share the same request.
 * (Official only returns one because multiplayer is not supported)
 *
 * @author Anthony Fuller
 * @param userId The id of the user.
 * @param gameVersion The game version.
 * @param contractData The contract's data.
 * @param loadoutData Should the output just contain loadout data in an array?
 * @returns An array containing the sniper loadouts data for all three characters
 * if the contract is a sniper mission, or an empty array otherwise.
 */
export function createSniperLoadouts(
    userId: string,
    gameVersion: GameVersion,
    contractData: MissionManifest,
    loadoutData = false,
): Return {
    const sniperLoadouts: Return = []
    const parentLocation = getSubLocationByName(
        contractData.Metadata.Location,
        gameVersion,
    )?.Properties.ParentLocation

    assert.ok(parentLocation, "Parent location not found")

    // This function call is used as it gets all mastery data for the current location
    // which includes all the characters we'll need.
    // We map it by Id for quick lookup.
    const masteryMap = new Map(
        controller.masteryService
            .getMasteryDataForDestination(parentLocation, gameVersion, userId)
            .map((data) => [data.CompletionData.Id, data]),
    )

    if (contractData.Metadata.Type !== "sniper") {
        return sniperLoadouts
    }

    assert.ok(
        contractData.Metadata.CharacterSetup,
        "Contract missing sniper character setup",
    )

    for (const charSetup of contractData.Metadata.CharacterSetup) {
        for (const character of charSetup.Characters) {
            // Get the mastery data for this character
            const masteryData = masteryMap.get(
                character.MandatoryLoadout?.[0] || "",
            )

            assert.ok(
                masteryData,
                `Mastery data not found for ${contractData.Metadata.Id}`,
            )

            // Get the unlockable that is currently unlocked
            const curUnlockable =
                masteryData.CompletionData.Level === 1
                    ? masteryData.Unlockable
                    : masteryData.Drops[
                          (getFlag("enableMasteryProgression")
                              ? masteryData.CompletionData.Level
                              : 20) - 2
                      ].Unlockable

            assert.ok(curUnlockable, "Unlockable not found")
            assert.ok(
                curUnlockable.Properties.Gameplay,
                "Unlockable has no gameplay data",
            )

            const data: SniperCharacter = {
                Id: character.Id,
                Loadout: {
                    LoadoutData: [
                        {
                            SlotId: "0",
                            SlotName: "carriedweapon",
                            Items: [],
                            Page: 0,
                            Recommended: {
                                item: {
                                    InstanceId: character.Id,
                                    ProfileId: userId,
                                    Unlockable: curUnlockable,
                                    Properties: {},
                                },
                                type: "carriedweapon",
                                owned: true,
                            },
                            HasMore: false,
                            HasMoreLeft: false,
                            HasMoreRight: false,
                            OptionalData: {},
                        },
                    ],
                    LimitedLoadoutUnlockLevel: 0 as number | undefined,
                },
                CompletionData: masteryData.CompletionData,
            }

            data.Loadout.LoadoutData[0].Items.push({
                Item: {
                    InstanceId: character.Id,
                    ProfileId: userId,
                    Unlockable: curUnlockable,
                    Properties: {},
                },
                ItemDetails: {
                    Capabilities: [],
                    StatList: Object.keys(
                        curUnlockable.Properties.Gameplay,
                    ).map((key) => ({
                        Name: key,
                        // @ts-expect-error This will work.
                        Ratio: curUnlockable.Properties.Gameplay[key],
                    })),
                    PropertyTexts: [],
                },
            })

            if (loadoutData) {
                delete data.Loadout.LimitedLoadoutUnlockLevel
                sniperLoadouts.push(data.Loadout)
                continue
            }

            sniperLoadouts.push(data)
        }
    }

    return sniperLoadouts
}
