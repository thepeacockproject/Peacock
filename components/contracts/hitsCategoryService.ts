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
    preserveContracts,
} from "../controller"
import { getUserData, writeUserData } from "../databaseHandler"
import { orderedETs } from "./elusiveTargets"
import { userAuths } from "../officialServerAuth"
import { log, LogLevel } from "../loggingInterop"
import { fastClone, getRemoteService } from "../utils"
import { orderedETAs } from "./elusiveTargetArcades"
import { missionsInLocations } from "./missionsInLocation"

/**
 * The filters supported for HitsCategories.
 * Supported for "MyPlaylist" "MyHistory" and "MyContracts".
 */
type ContractFilter = "default" | "all" | "completed" | "failed" | string

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
    public paginationExempt = [
        "Elusive_Target_Hits",
        "Arcade",
        "Sniper",
        "ContractAttack",
    ]
    public realtimeFetched = ["Trending", "MostPlayedLastWeek"]
    public filterSupported = ["MyPlaylist", "MyHistory", "MyContracts"]

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

        // Sniper Challenge

        this.hitsCategories.for("Sniper").tap(tapName, (contracts) => {
            contracts.push("ff9f46cf-00bd-4c12-b887-eac491c3a96d")
            contracts.push("00e57709-e049-44c9-a2c3-7655e19884fb")
            contracts.push("25b20d86-bb5a-4ebd-b6bb-81ed2779c180")
        })

        // Elusives

        this.hitsCategories
            .for("Elusive_Target_Hits")
            .tap(tapName, (contracts, gameVersion) => {
                for (const id of orderedETs) {
                    const contract = controller.resolveContract(id)

                    switch (gameVersion) {
                        case "h1":
                            if (contract.Metadata.Season === 1)
                                contracts.push(id)
                            break
                        case "h2":
                            if (contract.Metadata.Season <= 2)
                                contracts.push(id)
                            break
                        default:
                            contracts.push(id)
                    }
                }
            })

        // My Contracts

        this.hitsCategories
            .for("MyContracts")
            .tap(tapName, (contracts, gameVersion, userId, filter) => {
                this.writeMyContracts(gameVersion, contracts, userId, filter)
            })

        // Featured

        this.hitsCategories
            .for("Featured")
            .tap(tapName, (contracts, gameVersion) => {
                const cagedBull = "ee0411d6-b3e7-4320-b56b-25c45d8a9d61"
                const clonedGroups = fastClone(featuredContractGroups)

                for (const fcGroup of clonedGroups) {
                    if (gameVersion === "h1" && fcGroup.includes(cagedBull)) {
                        fcGroup.splice(
                            fcGroup.findIndex((id) => id === cagedBull),
                            1,
                        )
                    }

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

        // Arcade

        this.hitsCategories
            .for("Arcade")
            .tap(tapName, (contracts, gameVersion) => {
                // Just in case
                if (gameVersion !== "h3") return
                contracts.push(...orderedETAs)
            })

        // Escalations

        this.hitsCategories
            .for("ContractAttack")
            .tap(tapName, (contracts, gameVersion) => {
                for (const escalations of Object.values(
                    missionsInLocations.escalations,
                )) {
                    for (const id of escalations) {
                        const contract = controller.resolveContract(id)

                        const season =
                            contract.Metadata.Season === 0
                                ? contract.Metadata.OriginalSeason
                                : contract.Metadata.Season

                        switch (gameVersion) {
                            case "h1":
                                // This is a Peacock contract, we must skip it.
                                if (contract.Metadata.Season === 0) break
                                if (season === 1) contracts.push(id)
                                break
                            case "h2":
                                if (season <= 2) contracts.push(id)
                                break
                            default:
                                contracts.push(id)
                        }
                    }
                }
            })
    }

    private async fetchFromOfficial(
        categoryName: string,
        pageNumber: number,
        gameVersion: GameVersion,
        userId: string,
    ): Promise<HitsCategoryCategory> {
        const remoteService = getRemoteService(gameVersion)
        const user = userAuths.get(userId)

        if (!user) {
            log(LogLevel.WARN, `No authentication for user ${userId}!`)
            return undefined
        }

        const resp = await user._useService<{
            data: HitsCategoryCategory
        }>(
            `https://${remoteService}.hitman.io/profiles/page/HitsCategory?page=${pageNumber}&type=${categoryName}&mode=dataonly`,
            true,
        )
        const hits = resp.data.data.Data.Hits
        preserveContracts(
            hits.map(
                (hit) => hit.UserCentricContract.Contract.Metadata.PublicId,
            ),
        )

        // Fix completion and favorite status for retrieved contracts
        const userProfile = getUserData(userId, gameVersion)
        const played = userProfile?.Extensions.PeacockPlayedContracts
        const favorites = userProfile?.Extensions.PeacockFavoriteContracts

        hits.forEach((hit) => {
            if (Object.keys(played).includes(hit.Id)) {
                // Replace with data stored by Peacock
                hit.UserCentricContract.Data.LastPlayedAt = new Date(
                    played[hit.Id].LastPlayedAt,
                ).toISOString()
                hit.UserCentricContract.Data.Completed =
                    played[hit.Id].Completed
            } else {
                // Never played on Peacock
                delete hit.UserCentricContract.Data.LastPlayedAt
                hit.UserCentricContract.Data.Completed = false
            }

            hit.UserCentricContract.Data.PlaylistData.IsAdded =
                favorites.includes(hit.Id)
        })

        return resp.data.data
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
     * This function will get or set the default filter of a category for a user, depending on the "type" passed.
     * If the type is "default", then it will get the default filter and return it.
     * Otherwise, it will set the default filter to the type passed, and return the type itself.
     * @param gameVersion The GameVersion that the user is playing on.
     * @param userId The ID of the user.
     * @param type The type of the filter.
     * @param category The category in question.
     * @returns The filter to use for this request.
     */
    private getOrSetDefaultFilter(
        gameVersion: GameVersion,
        userId: string,
        type: ContractFilter,
        category: string,
    ): string | undefined {
        if (!this.filterSupported.includes(category)) return undefined
        const user = getUserData(userId, gameVersion)

        if (type === "default") {
            type = user.Extensions.gamepersistentdata.HitsFilterType[category]
        } else {
            user.Extensions.gamepersistentdata.HitsFilterType[category] = type
            writeUserData(userId, gameVersion)
        }

        return type
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
                return (
                    played[contractId]?.Completed &&
                    !played[contractId]?.IsEscalation
                )
            case "failed":
                return (
                    played[contractId] !== undefined &&
                    played[contractId].Completed === undefined &&
                    !played[contractId]?.IsEscalation
                )
            case "all":
                return !played[contractId]?.IsEscalation ?? true
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
    public async paginateHitsCategory(
        categoryName: string,
        pageNumber: number,
        gameVersion: GameVersion,
        userId: string,
    ): Promise<HitsCategoryCategory> {
        if (this.realtimeFetched.includes(categoryName)) {
            return await this.fetchFromOfficial(
                categoryName,
                pageNumber,
                gameVersion,
                userId,
            )
        }

        const categoryTypes = categoryName.split("_")
        const category =
            categoryName === "Elusive_Target_Hits"
                ? categoryName
                : categoryTypes[0]
        let filter = categoryTypes.length === 2 ? categoryTypes[1] : "default"

        filter = this.getOrSetDefaultFilter(
            gameVersion,
            userId,
            filter,
            category,
        )

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
            hitsCategory.CurrentSubType = filter
                ? `${category}_${filter}`
                : categoryName
        } else {
            hitsCategory.Data.Hits = hitObjectList
            hitsCategory.CurrentSubType = category
        }

        return hitsCategory
    }
}

export const hitsCategoryService = new HitsCategoryService()
