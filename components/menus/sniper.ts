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

import { controller } from "components/controller"
import { nilUuid } from "components/utils"
import { getConfig } from "../configSwizzleManager"
import type {
    GameVersion,
    MissionManifest,
    SniperLoadout,
} from "../types/types"

export type SniperLoadoutConfig = {
    [locationId: string]: {
        [firearmCharacter: string]: SniperLoadout
    }
}

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

    if (contractData.Metadata.Type === "sniper") {
        const sLoadouts = getConfig<SniperLoadoutConfig>("SniperLoadouts", true)

        for (const index in sLoadouts[contractData.Metadata.Location]) {
            const character = sLoadouts[contractData.Metadata.Location][index]
            const data = {
                Id: character.ID,
                Loadout: {
                    LoadoutData: [
                        {
                            SlotId: "0",
                            SlotName: "carriedweapon",
                            Items: [
                                {
                                    Item: {
                                        InstanceId: character.InstanceID,
                                        ProfileId: nilUuid,
                                        // TODO: All mastery upgrades are unlocked. Change this when adding sniper progression.
                                        Unlockable: character.Unlockable[18],
                                        Properties: {},
                                    },
                                    ItemDetails: {
                                        Capabilities: [],
                                        StatList: [
                                            {
                                                Name: "clipsize",
                                                Ratio: 0.2,
                                            },
                                            {
                                                Name: "damage",
                                                Ratio: 1.0,
                                            },
                                            {
                                                Name: "range",
                                                Ratio: 1.0,
                                            },
                                            {
                                                Name: "rateoffire",
                                                Ratio: 0.3,
                                            },
                                        ],
                                        PropertyTexts: [],
                                    },
                                },
                            ],
                            Page: 0,
                            Recommended: {
                                item: {
                                    InstanceId: nilUuid,
                                    ProfileId: nilUuid,
                                    // TODO: All mastery upgrades are unlocked. Change this when adding sniper progression.
                                    Unlockable: character.Unlockable[18],
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
                CompletionData: controller.masteryService.getFirearmCompletion(
                    index,
                    character.MainUnlockable.Properties.Name,
                    userId,
                    gameVersion,
                ),
            }

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
