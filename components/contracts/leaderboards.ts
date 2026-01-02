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

import { gameDifficulty, PEACOCKVERSTRING } from "../utils"
import { controller } from "../controller"
import axios from "axios"
import { getFlag } from "../flags"
import { fakePlayerRegistry } from "../profileHandler"
import { GameVersion, JwtData, MissionManifest } from "../types/types"

type ApiLeaderboardEntry = {
    LeaderboardData: {
        Player: {
            displayName: string
        }
    }
    entryId: number
    platformId: string
    // TODO: finish this type
    // https://darca.localhost/leaderboards/contracts/00000000-0000-0000-0000-000000000200/h3/steam/normal/entries?page=1
    detailedscore: unknown
}

type GameFacingLeaderboardData = {
    Entries: ApiLeaderboardEntry[]
    Contract: MissionManifest
    Page: number
    HasMore: boolean
    LeaderboardType: string
}

export async function getLeaderboardEntries(
    contractId: string,
    platform: JwtData["platform"],
    gameVersion: GameVersion,
    difficultyLevel: string | undefined,
    page: number,
): Promise<GameFacingLeaderboardData | undefined> {
    let difficulty = "unset"

    const contract = controller.resolveContract(contractId, gameVersion)

    if (!contract) {
        return undefined
    }

    const parsedDifficulty = parseInt(difficultyLevel || "0")

    if (parsedDifficulty === gameDifficulty.casual) {
        difficulty = "casual"
    }

    if (parsedDifficulty === gameDifficulty.normal) {
        difficulty = "normal"
    }

    if (parsedDifficulty === gameDifficulty.master) {
        difficulty = "master"
    }

    const response: GameFacingLeaderboardData = {
        Entries: [],
        Contract: contract,
        Page: page,
        HasMore: false,
        LeaderboardType: "singleplayer",
    }

    const host = getFlag("leaderboardsHost") as string

    const entries = (
        await axios.get<ApiLeaderboardEntry[]>(
            `${host}/leaderboards/contracts/${contractId}/${gameVersion}/${platform}/${difficulty}/entries`,
            {
                params: {
                    page: page + 1, // game paginates base-0, server paginates base-1
                },
                headers: {
                    "Peacock-Version": PEACOCKVERSTRING,
                },
            },
        )
    ).data

    if (entries.length === 100) {
        // educated guess since the API currently doesn't actually tell us
        response.HasMore = true
    }

    const ids: readonly string[] = entries.map((te) =>
        fakePlayerRegistry.index(
            te.LeaderboardData.Player.displayName,
            platform,
            te.platformId,
        ),
    )

    entries.forEach((entry, index) => {
        // @ts-expect-error Remapping on different types
        entry.LeaderboardData.Player = ids[index]
    })

    response.Entries = entries

    return response
}
