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

import { controller } from "../controller"
import type { GameVersion, MissionManifest } from "../types/types"
import { getSubLocationByName } from "../contracts/dataGen"

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
) {
    const sniperLoadouts = []
    const parentLocation = getSubLocationByName(
        contractData.Metadata.Location,
        gameVersion,
    ).Properties.ParentLocation

    // This function call is used as it gets all mastery data for the current location
    // which includes all the characters we'll need.
    // We map it by Id for quick lookup.
    const masteryMap = new Map(
        controller.masteryService
            .getMasteryDataForDestination(parentLocation, gameVersion, userId)
            .map((data) => [data.CompletionData.Id, data]),
    )

    if (contractData.Metadata.Type === "sniper") {
        for (const charSetup of contractData.Metadata.CharacterSetup) {
            for (const character of charSetup.Characters) {
                // Get the mastery data for this character
                const masteryData = masteryMap.get(
                    character.MandatoryLoadout[0],
                )

                // Get the unlockable that is currently unlocked
                const curUnlockable =
                    masteryData.CompletionData.Level === 1
                        ? masteryData.Unlockable
                        : masteryData.Drops[
                              masteryData.CompletionData.Level - 2
                          ].Unlockable

                const data = {
                    Id: character.Id,
                    Loadout: {
                        LoadoutData: [
                            {
                                SlotId: "0",
                                SlotName: "carriedweapon",
                                Items: [
                                    {
                                        Item: {
                                            InstanceId: character.Id,
                                            ProfileId: userId,
                                            Unlockable: curUnlockable,
                                            Properties: {},
                                        },
                                        ItemDetails: {
                                            Capabilities: [],
                                            StatList: Object.keys(
                                                curUnlockable.Properties
                                                    .Gameplay,
                                            ).map((key) => {
                                                return {
                                                    Name: key,
                                                    Ratio: curUnlockable
                                                        .Properties.Gameplay[
                                                        key
                                                    ],
                                                }
                                            }),
                                            PropertyTexts: [],
                                        },
                                    },
                                ],
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

                if (loadoutData) {
                    delete data.Loadout.LimitedLoadoutUnlockLevel
                    sniperLoadouts.push(data.Loadout)
                    continue
                }

                sniperLoadouts.push(data)
            }
        }
    }

    return sniperLoadouts
}
