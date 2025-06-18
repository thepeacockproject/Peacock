/*
 *     The Peacock Project - a HITMAN server replacement.
 *     Copyright (C) 2021-2025 The Peacock Project Team
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
    gameVersion: {
        id: number
        name: string
    }
    platformId: string
    platform: {
        id: number
        name: string
    }
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
    difficultyLevel?: string,
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
        Page: 0,
        HasMore: false,
        LeaderboardType: "singleplayer",
    }

    const host = getFlag("leaderboardsHost") as string

    const entries = (
        await axios.post<ApiLeaderboardEntry[]>(
            `${host}/leaderboards/entries/${contractId}`,
            {
                gameVersion,
                difficulty,
                platform,
            },
            {
                headers: {
                    "Peacock-Version": PEACOCKVERSTRING,
                },
            },
        )
    ).data

    const ids: readonly string[] = entries.map((te) =>
        fakePlayerRegistry.index(
            te.LeaderboardData.Player.displayName,
            te.platform.name,
            te.platformId,
        ),
    )

    entries.forEach((entry, index) => {
        // @ts-expect-error Remapping on different types
        entry.LeaderboardData.Player = ids[index]
        return entry
    })

    response.Entries = entries

    return response
}
