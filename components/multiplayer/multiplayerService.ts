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

import { log, LogLevel } from "../loggingInterop"
import { Router } from "express"
import { enqueuePushMessage } from "../eventHandler"
import { json as jsonMiddleware } from "body-parser"
import {
    ClientToServerEvent,
    ContractSession,
    RequestWithJwt,
    UserCentricContract,
} from "../types/types"
import { nilUuid } from "../utils"
import { randomUUID } from "crypto"
import { getConfig } from "../configSwizzleManager"
import { generateUserCentric } from "../contracts/dataGen"
import { controller } from "../controller"
import { MatchOverC2SEvent } from "../types/events"

/**
 * A multiplayer preset.
 */
export interface MultiplayerPreset {
    /**
     * The preset's ID.
     */
    Id: string
    /**
     * The preset's game mode.
     */
    GameMode: "versus" | string
    Metadata: {
        Title: string
        Header: string
        Image: string
        IsDefault: boolean
    }
    Data: {
        Contracts: string[]
        Properties: {
            mode: string
            active: boolean
            __comment?: string
        }
    }
}

export interface MatchData {
    Players: string[]
    MatchData: {
        contractId: string
        [key: string]: unknown
    }
}

/**
 * Extension for a session providing ghost mode details.
 */
export interface SessionGhostModeDetails {
    deaths: number
    unnoticedKills: number
    Opponents: string[]
    IsWinner: boolean
    Score: number
    OpponentScore: number
    IsDraw: boolean
    timerEnd: number | null
}

export const multiplayerRouter = Router()
const activeMatches: Map<string, MatchData> = new Map()

multiplayerRouter.post(
    "/GetRequiredResourcesForPreset",
    jsonMiddleware(),
    (req: RequestWithJwt, res) => {
        const allPresets = getConfig<MultiplayerPreset[]>(
            "MultiplayerPresets",
            false,
        )

        const requestedPreset = allPresets.find(
            (preset) => preset.Id === req.body.id,
        )

        if (!requestedPreset) {
            res.status(404).end()
            log(LogLevel.WARN, "unknown multiplayer preset id requested")
            return
        }

        const contractIds = requestedPreset.Data.Contracts
        const userCentrics = contractIds
            .map((id) =>
                generateUserCentric(
                    controller.resolveContract(id),
                    req.jwt.unique_name,
                    req.gameVersion,
                ),
            )
            .filter(Boolean)

        res.json(
            userCentrics.map((userCentric: UserCentricContract) => ({
                Id: userCentric.Contract.Metadata.Id,
                DlcId: userCentric.Data.DlcName,
                Resources: [
                    userCentric.Contract.Metadata.ScenePath,
                    ...(userCentric.Contract.Data.Bricks ?? []),
                ],
            })),
        )
    },
)

multiplayerRouter.post(
    "/RegisterToMatch",
    jsonMiddleware(),
    (req: RequestWithJwt, res) => {
        // get a random contract from the list of possible ones in the selected preset
        const multiplayerPresets = getConfig<MultiplayerPreset[]>(
            "MultiplayerPresets",
            false,
        )

        if (!req.body.presetId) {
            req.body.presetId = "d72d7cc9-ee26-4c7d-857a-75abdc9ccb61" // default to miami invite preset
        }

        const preset = multiplayerPresets.find(
            (preset) => preset.Id === req.body.presetId,
        )

        if (!preset) {
            res.status(404).end()
            log(
                LogLevel.WARN,
                `Unknown preset id requested (${req.body.presetId})`,
            )
            return
        }

        const contractId =
            preset.Data.Contracts[
                Math.trunc(Math.random() * preset.Data.Contracts.length)
            ]

        if (req.body.matchId === nilUuid) {
            // create new match
            req.body.matchId = randomUUID()
            activeMatches.set(req.body.matchId, {
                MatchData: {
                    contractId: contractId,
                },
                Players: [req.jwt.unique_name],
            })
        } else if (activeMatches.has(req.body.matchId)) {
            // join existing match
            const match = activeMatches.get(req.body.matchId)!

            match.Players.forEach((playerId) =>
                enqueuePushMessage(playerId, {
                    MatchId: req.body.matchId,
                    Type: 1,
                    PlayerId: req.jwt.unique_name,
                    MatchData: null,
                }),
            )

            match.Players.push(req.jwt.unique_name)
        } else {
            // MatchId not found
            res.status(404).end()
            return
        }

        enqueuePushMessage(req.jwt.unique_name, {
            MatchId: req.body.matchId,
            Type: 3,
            PlayerId: nilUuid,
            MatchData: activeMatches.get(req.body.matchId)!.MatchData,
        })

        res.json({
            MatchId: req.body.matchId,
            PreferedHostIndex: 0,
            Tickets: [],
            MatchMode: null,
            MatchData: null,
            MatchStats: {},
            MatchType: 0,
        })
    },
)

multiplayerRouter.post(
    "/SetMatchData",
    jsonMiddleware(),
    (req: RequestWithJwt, res) => {
        const match = activeMatches.get(req.body.matchId)

        if (!(match && match.Players.includes(req.jwt.unique_name))) {
            res.status(404).end()
            return
        }

        match.MatchData[req.body.key] = req.body.value
        res.json({
            MatchId: req.body.matchId,
            PreferedHostIndex: 0,
            Tickets: [],
            MatchMode: null,
            MatchData: match.MatchData,
            MatchStats: {},
            MatchType: 0,
        })
    },
)

multiplayerRouter.post("/RegisterToPreset", jsonMiddleware(), (req, res) => {
    // matchmaking
    // TODO: implement matchmaking
    // req.body.presetId
    // req.body.lobbyId (this is just a timestamp?)
    res.status(500).end()
})

export function handleMultiplayerEvent(
    event: ClientToServerEvent,
    session: ContractSession,
): boolean {
    const emptySession = <SessionGhostModeDetails>{}
    const ghost = session.ghost || emptySession

    switch (event.Name) {
        case "Ghost_PlayerDied":
            ghost.deaths += 1
            return true
        case "Ghost_TargetUnnoticed":
            ghost.unnoticedKills += 1
            return true
        case "Opponents": {
            const value = event.Value as {
                ConnectedSessions: string[]
            }

            ghost.Opponents = value.ConnectedSessions
            return true
        }
        case "MatchOver": {
            const matchOverValue = (event as MatchOverC2SEvent).Value

            ghost.Score = matchOverValue.MyScore
            ghost.OpponentScore = matchOverValue.OpponentScore
            ghost.IsWinner = matchOverValue.IsWinner
            ghost.IsDraw = matchOverValue.IsDraw
            ghost.timerEnd = event.Timestamp

            return true
        }

        default:
            return false
    }
}
