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

import { getConfig } from "../configSwizzleManager"
import { generateUserCentric } from "../contracts/dataGen"
import { controller } from "../controller"
import type {
    GameVersion,
    MissionStory,
    PlayNextCampaignDetails,
    UserCentricContract,
} from "../types/types"
import assert from "assert"

/**
 * Main story campaign ordered mission IDs.
 */
export const orderedMainCampaignMissions: string[] = [
    // h1
    "00000000-0000-0000-0000-000000000200",
    "00000000-0000-0000-0000-000000000600",
    "00000000-0000-0000-0000-000000000400",
    "db341d9f-58a4-411d-be57-0bc4ed85646b",
    "42bac555-bbb9-429d-a8ce-f1ffdf94211c",
    "0e81a82e-b409-41e9-9e3b-5f82e57f7a12",
    // h2
    "c65019e5-43a8-4a33-8a2a-84c750a5eeb3",
    "c1d015b4-be08-4e44-808e-ada0f387656f",
    "422519be-ed2e-44df-9dac-18f739d44fd9",
    "0fad48d7-3d0f-4c66-8605-6cbe9c3a46d7",
    "82f55837-e26c-41bf-bc6e-fa97b7981fbc",
    "b2aac100-dfc7-4f85-b9cd-528114436f6c",
    "0d225edf-40cd-4f20-a30f-b62a373801d3",
    "7a03a97d-238c-48bd-bda0-e5f279569cce",
    "095261b5-e15b-4ca1-9bb7-001fb85c5aaa",
    // h3
    "7d85f2b0-80ca-49be-a2b7-d56f67faf252",
    "755984a8-fb0b-4673-8637-95cfe7d34e0f",
    "ebcd14b2-0786-4ceb-a2a4-e771f60d0125",
    "3d0cbb8c-2a80-442a-896b-fea00e98768c",
    "d42f850f-ca55-4fc9-9766-8c6a2b5c3129",
    "a3e19d55-64a6-4282-bb3c-d18c3f3e6e29",
]

/**
 * Ordered Patient Zero campaign mission IDs.
 */
export const orderedPZMissions: string[] = [
    "024b6964-a3bb-4457-b085-08f9a7dc7fb7",
    "7e3f758a-2435-42de-93bd-d8f0b72c63a4",
    "ada6205e-6ee8-4189-9cdb-4947cccd84f4",
    "a2befcec-7799-4987-9215-6a152cb6a320",
]

/**
 * Ordered sniper campaign mission IDs.
 */
export const sniperMissionIds: string[] = [
    "ff9f46cf-00bd-4c12-b887-eac491c3a96d",
    "00e57709-e049-44c9-a2c3-7655e19884fb",
    "25b20d86-bb5a-4ebd-b6bb-81ed2779c180",
]

/**
 * Gets the ID for a season based on the main mission index.
 */
function getSeasonId(index: number): string {
    if (index <= 5) {
        return "1"
    }

    if (index <= 14) {
        return "2"
    }

    return "3"
}

/**
 * Generates a "Continue Story" tile for play next given a contract ID and other details.
 *
 * @param userId The user's ID.
 * @param contractId The next contract ID.
 * @param gameVersion The game version.
 * @param campaignInfo The campaign information.
 * @returns The tile object.
 */
export function createPlayNextMission(
    userId: string,
    contractId: string,
    gameVersion: GameVersion,
    campaignInfo: PlayNextCampaignDetails,
): PlayNextCategory {
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
                        controller.resolveContract(contractId, gameVersion),
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

export type PlayNextCategory = {
    CategoryType: "NextMission" | "MainOpportunity" | "MenuPage"
    CategoryName: string
    Items: {
        ItemType: null | unknown
        ContentType: "Contract" | "Opportunity" | "MenuPage"
        Content: {
            ContractId?: string
            RepositoryId?: string
            Name?: string
            UserCentricContract?: UserCentricContract
            CampaignInfo?: PlayNextCampaignDetails
        }
        CategoryType: "NextMission" | "MainOpportunity" | "MenuPage"
    }[]
}

/**
 * Generates tiles for recommended mission stories given a contract ID.
 * @param contractId The contract ID.
 * @param gameVersion The game's version.
 * @returns The tile object.
 */
export function createMainOpportunityTile(
    contractId: string,
    gameVersion: GameVersion,
): PlayNextCategory {
    const contractData = controller.resolveContract(contractId, gameVersion)

    const missionStories = getConfig<Record<string, MissionStory>>(
        "MissionStories",
        false,
    )

    assert.ok(contractData)

    return {
        CategoryType: "MainOpportunity",
        CategoryName: "UI_PLAYNEXT_MAINOPPORTUNITY_CATEGORY_NAME",
        Items: (contractData.Metadata.Opportunities || [])
            .filter((value) => missionStories[value].IsMainOpportunity)
            .map((value) => ({
                ItemType: null,
                ContentType: "Opportunity",
                Content: {
                    RepositoryId: value,
                    ContractId: contractId,
                },
                CategoryType: "MainOpportunity",
            })),
    }
}

/**
 * Generates tiles for menu pages
 * @param menuPages An array of menu page IDs.
 * @returns The tile object
 */
export function createMenuPageTile(...menuPages: string[]): PlayNextCategory {
    // This is all based on what sniper does, not sure if any others have it.
    return {
        CategoryType: "MenuPage",
        CategoryName: "UI_MENU_PAGE_DEBRIEFING_MAIN_MENU",
        Items: menuPages.map((id) => ({
            ItemType: null,
            ContentType: "MenuPage",
            CategoryType: "MenuPage",
            Content: {
                Name: id,
            },
        })),
    }
}

export type GameFacingPlayNextData = {
    Categories: PlayNextCategory[]
    ProfileId: string
}

export function getGamePlayNextData(
    contractId: string,
    userId: string,
    gameVersion: GameVersion,
): GameFacingPlayNextData {
    const cats: PlayNextCategory[] = []

    const currentIdIndex = orderedMainCampaignMissions.indexOf(contractId)

    if (
        currentIdIndex !== -1 &&
        currentIdIndex !== orderedMainCampaignMissions.length - 1
    ) {
        const nextMissionId = orderedMainCampaignMissions[currentIdIndex + 1]
        const nextSeasonId = getSeasonId(currentIdIndex + 1)

        let shouldContinue = true

        // nextSeasonId > gameVersion's integer
        if (parseInt(nextSeasonId) > parseInt(gameVersion[1])) {
            shouldContinue = false
        }

        if (shouldContinue) {
            cats.push(
                createPlayNextMission(userId, nextMissionId, gameVersion, {
                    CampaignName: `UI_SEASON_${nextSeasonId}`,
                }),
            )
        }

        cats.push(createMainOpportunityTile(contractId, gameVersion))
    }

    const pzIdIndex = orderedPZMissions.indexOf(contractId)

    if (pzIdIndex !== -1 && pzIdIndex !== orderedPZMissions.length - 1) {
        const nextMissionId = orderedPZMissions[pzIdIndex + 1]
        cats.push(
            createPlayNextMission(userId, nextMissionId, gameVersion, {
                CampaignName: "UI_CONTRACT_CAMPAIGN_WHITE_SPIDER_TITLE",
                ParentCampaignName: "UI_MENU_PAGE_SIDE_MISSIONS_TITLE",
            }),
        )
    }

    // Atlantide mini-campaign (Miami Cottonmouth -> Skunk Gartersnake)
    if (contractId === "f1ba328f-e3dd-4ef8-bb26-0363499fdd95") {
        const nextMissionId = "0b616e62-af0c-495b-82e3-b778e82b5912"
        cats.push(
            createPlayNextMission(userId, nextMissionId, gameVersion, {
                CampaignName: "UI_MENU_PAGE_SPECIAL_ASSIGNMENTS_TITLE",
                ParentCampaignName: "UI_MENU_PAGE_SIDE_MISSIONS_TITLE",
            }),
        )
    }

    if (sniperMissionIds.includes(contractId)) {
        cats.push(createMenuPageTile("sniper"))
    }

    const pluginData = controller.hooks.getNextCampaignMission.call(
        contractId,
        gameVersion,
    )

    if (pluginData) {
        if (pluginData.overrideIndex !== undefined) {
            cats[pluginData.overrideIndex] = createPlayNextMission(
                userId,
                pluginData.nextContractId,
                gameVersion,
                pluginData.campaignDetails,
            )
        } else {
            cats.push(
                createPlayNextMission(
                    userId,
                    pluginData.nextContractId,
                    gameVersion,
                    pluginData.campaignDetails,
                ),
            )
        }
    }

    return {
        Categories: cats,
        ProfileId: userId,
    }
}
