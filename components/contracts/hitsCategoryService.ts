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
import { GameVersion, HitsCategoryCategory } from "../types/types"
import {
    contractIdToHitObject,
    controller,
    featuredContractGroups,
    preserveContracts,
} from "../controller"
import { getUserData } from "../databaseHandler"
import { orderedETs } from "./elusiveTargets"
import { userAuths } from "components/officialServerAuth"
import { log, LogLevel } from "components/loggingInterop"
import { getRemoteService } from "components/utils"

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
                /** gameVersion */ GameVersion,
                /** contractIds */ string[],
                /** hitsCategory */ HitsCategoryCategory,
                /** userId */ string,
            ]
        >
    >

    /**
     * Hits categories that should not be automatically paginated.
     */
    public paginationExempt = ["Elusive_Target_Hits", "Arcade", "Sniper"]
    public realtimeFetched = ["Trending", "MostPlayedLastWeek"]

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

        this.hitsCategories
            .for("Sniper")
            .tap(tapName, (gameVersion, contracts) => {
                contracts.push("ff9f46cf-00bd-4c12-b887-eac491c3a96d")
                contracts.push("00e57709-e049-44c9-a2c3-7655e19884fb")
                contracts.push("25b20d86-bb5a-4ebd-b6bb-81ed2779c180")
            })

        this.hitsCategories
            .for("Elusive_Target_Hits")
            .tap(tapName, (gameVersion, contracts) => {
                contracts.push(...orderedETs)
            })

        this.hitsCategories
            .for("MyContracts")
            .tap(tapName, (gameVersion, contracts, hitsCategory) => {
                hitsCategory.CurrentSubType = "MyContracts"

                for (const contract of controller.contracts.values()) {
                    contracts.push(contract.Metadata.Id)
                }
            })

        this.hitsCategories
            .for("Featured")
            .tap(tapName, (gameVersion, contracts) => {
                for (const fcGroup of featuredContractGroups) {
                    contracts.push(...fcGroup)
                }
            })

        this.hitsCategories
            .for("MyPlaylist")
            .tap(tapName, (gameVersion, contracts, hitsCategory, userId) => {
                const userProfile = getUserData(userId, gameVersion)
                const favs =
                    userProfile?.Extensions.PeacockFavoriteContracts ?? []

                contracts.push(...favs)

                hitsCategory.CurrentSubType = "MyPlaylist_all"
            })

        // intentionally don't handle Arcade
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

        // Stores the repo ID —— public ID lookup for the planning page to use.
        hits.forEach((hit) =>
            controller.contractIdToPublicId.set(
                hit.UserCentricContract.Contract.Metadata.Id,
                hit.UserCentricContract.Contract.Metadata.PublicId,
            ),
        )
        controller.storeIdToPublicId(hits.map((hit) => hit.UserCentricContract))

        return resp.data.data
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
        const hitsCategory: HitsCategoryCategory = {
            Category: categoryName,
            Data: {
                Type: categoryName,
                Hits: [],
                Page: pageNumber,
                HasMore: false,
            },
            CurrentSubType: categoryName,
        }

        const hook = this.hitsCategories.for(categoryName)

        const hits: string[] = []

        hook.call(gameVersion, hits, hitsCategory, userId)

        const hitObjectList = hits
            .map((id) => contractIdToHitObject(id, gameVersion, userId))
            .filter(Boolean)

        if (!this.paginationExempt.includes(categoryName)) {
            const paginated = paginate(hitObjectList, this.hitsPerPage)

            // ts-expect-error Type things.
            hitsCategory.Data.Hits = paginated[pageNumber]
            hitsCategory.Data.HasMore = paginated.length > pageNumber + 1
        } else {
            // ts-expect-error Type things.
            hitsCategory.Data.Hits = hitObjectList
        }

        return hitsCategory
    }
}

export const hitsCategoryService = new HitsCategoryService()
