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

import { HookMap, SyncHook } from "../hooksImpl"
import {
    ContractHistory,
    GameVersion,
    HitsCategoryCategory,
} from "../types/types"
import {
    contractIdToHitObject,
    controller,
    featuredContractGroups,
} from "../controller"
import { getUserData } from "../databaseHandler"
import { orderedETs } from "./elusiveTargets"

/**
 * The filters supported for HitsCategories.
 * Supported for "MyPlaylist" "MyHistory" and "MyContracts".
 */
type ContractFilter = "all" | "completed" | "failed" | string

function paginate<Element>(
    elements: Element[],
    displayPerPage: number,
): Element[][] {
    const totalElementCount: number = elements.length
    const pageCount = Math.ceil(totalElementCount / displayPerPage)
    const pages: Element[][] = []
    let perPageArray: Element[] = []
    let index = 0
    let condition = 0
    let pendingDispatchCount = 0

    for (let i = 0; i < pageCount; i++) {
        if (i === 0) {
            index = 0
            condition = displayPerPage
        }

        for (let j = index; j < condition; j++) {
            if (!elements[j]) {
                break
            }

            perPageArray.push(elements[j])
        }

        pages.push(perPageArray)

        if (i === 0) {
            pendingDispatchCount = totalElementCount - perPageArray.length
        } else {
            pendingDispatchCount = pendingDispatchCount - perPageArray.length
        }

        if (pendingDispatchCount > 0) {
            if (pendingDispatchCount > displayPerPage) {
                index = index + displayPerPage
                condition = condition + displayPerPage
            } else {
                index = index + perPageArray.length
                condition = condition + pendingDispatchCount
            }
        }

        perPageArray = []
    }

    return pages
}

export class HitsCategoryService {
    /**
     * A hook map for all the hits categories.
     */
    public hitsCategories: HookMap<
        SyncHook<
            [
                /** contractIds */ string[],
                /** gameVersion */ GameVersion,
                /** userId */ string,
                /** filter */ ContractFilter,
            ]
        >
    >

    /**
     * Hits categories that should not be automatically paginated.
     */
    public paginationExempt = ["Elusive_Target_Hits", "Arcade", "Sniper"]

    /**
     * The number of hits per page.
     */
    public hitsPerPage = 22

    constructor() {
        this.hitsCategories = new HookMap(() => new SyncHook())

        this._useDefaultHitsCategories()
    }

    /**
     * Enable the default hits categories.
     */
    _useDefaultHitsCategories(): void {
        const tapName = "HitsCategoryServiceImpl"

        this.hitsCategories.for("Sniper").tap(tapName, (contracts) => {
            contracts.push("ff9f46cf-00bd-4c12-b887-eac491c3a96d")
            contracts.push("00e57709-e049-44c9-a2c3-7655e19884fb")
            contracts.push("25b20d86-bb5a-4ebd-b6bb-81ed2779c180")
        })

        this.hitsCategories
            .for("Elusive_Target_Hits")
            .tap(tapName, (contracts) => {
                contracts.push(...orderedETs)
            })

        this.hitsCategories
            .for("MyContracts")
            .tap(tapName, (contracts, gameVersion, userId, filter) => {
                this.writeMyContracts(gameVersion, contracts, userId, filter)
            })

        this.hitsCategories.for("Featured").tap(tapName, (contracts) => {
            for (const fcGroup of featuredContractGroups) {
                contracts.push(...fcGroup)
            }
        })

        // My Favorites

        this.hitsCategories
            .for("MyPlaylist")
            .tap(tapName, (contracts, gameVersion, userId, filter) => {
                contracts.push(
                    ...this.getMyPlaylist(gameVersion, userId, filter),
                )
            })

        // My History

        this.hitsCategories
            .for("MyHistory")
            .tap(tapName, (contracts, gameVersion, userId, filter) => {
                contracts.push(
                    ...this.getMyHistory(gameVersion, userId, filter),
                )
            })

        // intentionally don't handle Trending
        // intentionally don't handle MostPlayedLastWeek
        // intentionally don't handle Arcade
    }

    /**
     * Writes the contracts array with the repoId of all contracts in the contracts folder that meet the player completion requirement specified by the type.
     * @param gameVersion The gameVersion the player is playing on.
     * @param contracts The array to write into.
     * @param userId The Id of the user.
     * @param type A filter for the contracts to fetch.
     */
    private writeMyContracts(
        gameVersion: GameVersion,
        contracts: string[],
        userId: string,
        type: ContractFilter,
    ): void {
        const userProfile = getUserData(userId, gameVersion)
        const played = userProfile?.Extensions.PeacockPlayedContracts

        for (const contract of controller.contracts.values()) {
            if (this.isContractOfType(played, type, contract.Metadata.Id)) {
                contracts.push(contract.Metadata.Id)
            }
        }
    }

    /**
     * Gets the contracts array with the repoId of all contracts of the specified type that is in the player's favorite list.
     * @param gameVersion The gameVersion the player is playing on.
     * @param userId The Id of the user.
     * @param type A filter for the contracts to fetch.
     * @returns The resulting array.
     */
    private getMyPlaylist(
        gameVersion: GameVersion,
        userId: string,
        type: ContractFilter,
    ): string[] {
        const userProfile = getUserData(userId, gameVersion)
        const played = userProfile?.Extensions.PeacockPlayedContracts
        const favs = userProfile?.Extensions.PeacockFavoriteContracts ?? []
        return favs.filter((id) => this.isContractOfType(played, type, id))
    }

    /**
     * Gets the contracts array with the repoId of all contracts of the specified type that the player has played before, sorted by LastPlayedTime.
     * @param gameVersion The gameVersion the player is playing on.
     * @param userId The Id of the user.
     * @param type A filter for the contracts to fetch.
     * @returns The resulting array.
     */
    private getMyHistory(
        gameVersion: GameVersion,
        userId: string,
        type: ContractFilter,
    ): string[] {
        const userProfile = getUserData(userId, gameVersion)
        const played = userProfile?.Extensions.PeacockPlayedContracts
        return Object.keys(played)
            .filter((id) => this.isContractOfType(played, type, id))
            .sort((a, b) => {
                return played[b].LastPlayedAt - played[a].LastPlayedAt
            })
    }

    /**
     * For a user, returns whether a contract is of the given type of completion.
     * @param played The user's played contracts.
     * @param type The type of completion in question.
     * @param contractId The id of the contract.
     * @returns A boolean, denoting the result.
     */
    private isContractOfType(
        played: {
            [contractId: string]: ContractHistory
        },
        type: ContractFilter,
        contractId: string,
    ): boolean {
        switch (type) {
            case "completed":
                return played[contractId]?.Completed
            case "failed":
                return (
                    played[contractId] !== undefined &&
                    played[contractId].Completed === undefined
                )
            case "all":
                return true
        }
    }

    /**
     * Generate a {@link HitsCategoryCategory} object for the current page.
     *
     * @param categoryName The hits category's ID (the key for the hooks map).
     * @param pageNumber The current page's number.
     * @param gameVersion The game version being used for the request.
     * @param userId The current user's ID.
     * @returns The {@link HitsCategoryCategory} object.
     */
    public paginateHitsCategory(
        categoryName: string,
        pageNumber: number,
        gameVersion: GameVersion,
        userId: string,
    ): HitsCategoryCategory {
        const categoryTypes = categoryName.split("_")
        const category =
            categoryName === "Elusive_Target_Hits"
                ? categoryName
                : categoryTypes[0]
        const filter = categoryTypes.length === 2 ? categoryTypes[1] : "all"

        const hitsCategory: HitsCategoryCategory = {
            Category: category,
            Data: {
                Type: category,
                Hits: [],
                Page: pageNumber,
                HasMore: false,
            },
            CurrentSubType: undefined,
        }

        const hook = this.hitsCategories.for(category)

        const hits: string[] = []

        hook.call(hits, gameVersion, userId, filter)

        const hitObjectList = hits
            .map((id) => contractIdToHitObject(id, gameVersion, userId))
            .filter(Boolean)

        if (!this.paginationExempt.includes(category)) {
            const paginated = paginate(hitObjectList, this.hitsPerPage)

            hitsCategory.Data.Hits = paginated[pageNumber]
            hitsCategory.Data.HasMore = paginated.length > pageNumber + 1
            hitsCategory.CurrentSubType = `${category}_${filter}`
        } else {
            hitsCategory.Data.Hits = hitObjectList
            hitsCategory.CurrentSubType = category
        }

        return hitsCategory
    }
}

export const hitsCategoryService = new HitsCategoryService()
