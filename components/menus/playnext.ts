/*
 *     The Peacock Project - a HITMAN server replacement.
 *     Copyright (C) 2021-2022 The Peacock Project Team
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

import { generateUserCentric } from "../contracts/dataGen"
import { controller } from "../controller"
import type { GameVersion, PlayNextCampaignDetails } from "../types/types"

export const orderedMissions: string[] = [
    "00000000-0000-0000-0000-000000000200",
    "00000000-0000-0000-0000-000000000600",
    "00000000-0000-0000-0000-000000000400",
    "db341d9f-58a4-411d-be57-0bc4ed85646b",
    "42bac555-bbb9-429d-a8ce-f1ffdf94211c",
    "0e81a82e-b409-41e9-9e3b-5f82e57f7a12",
    "c65019e5-43a8-4a33-8a2a-84c750a5eeb3",
    "c1d015b4-be08-4e44-808e-ada0f387656f",
    "422519be-ed2e-44df-9dac-18f739d44fd9",
    "0fad48d7-3d0f-4c66-8605-6cbe9c3a46d7",
    "82f55837-e26c-41bf-bc6e-fa97b7981fbc",
    "0d225edf-40cd-4f20-a30f-b62a373801d3",
    "7a03a97d-238c-48bd-bda0-e5f279569cce",
    "095261b5-e15b-4ca1-9bb7-001fb85c5aaa",
    "7d85f2b0-80ca-49be-a2b7-d56f67faf252",
    "755984a8-fb0b-4673-8637-95cfe7d34e0f",
    "ebcd14b2-0786-4ceb-a2a4-e771f60d0125",
    "3d0cbb8c-2a80-442a-896b-fea00e98768c",
    "d42f850f-ca55-4fc9-9766-8c6a2b5c3129",
    "a3e19d55-64a6-4282-bb3c-d18c3f3e6e29",
]

/**
 * Gets the ID for a season.
 *
 * @param index The index in orderedMissions.
 * @returns The season's ID. ("1", "2", or "3")
 * @see orderedMissions
 */
export function getSeasonId(index: number): string {
    if (index <= 5) {
        return "1"
    }

    if (index <= 13) {
        return "2"
    }

    return "3"
}

/**
 * Generates a tile for play next given a contract ID and other details.
 *
 * @param userId The user's ID.
 * @param contractId The next contract ID.
 * @param gameVersion The game version.
 * @param campaignInfo The campaign information.
 * @returns The tile object.
 */
export function createPlayNextTile(
    userId: string,
    contractId: string,
    gameVersion: GameVersion,
    campaignInfo: PlayNextCampaignDetails,
) {
    return {
        CategoryType: "NextMission",
        CategoryName: "UI_PLAYNEXT_CONTINUE_STORY_TITLE",
        Items: [
            {
                ItemType: null,
                ContentType: "Contract",
                Content: {
                    ContractId: contractId,
                    UserCentricContract: generateUserCentric(
                        controller.resolveContract(contractId),
                        userId,
                        gameVersion,
                    ),
                    CampaignInfo: campaignInfo,
                },
                CategoryType: "NextMission",
            },
        ],
    }
}
