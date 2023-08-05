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

import { ContractSession, GameVersion, UserProfile } from "../types/types"
import { randomUUID } from "crypto"
import { nilUuid } from "../utils"
import { log, LogLevel } from "../loggingInterop"
import assert from "assert"

import { getUnlockableById } from "../inventory"

export interface MultiplayerScore {
    Header?: {
        GameMode: "Ghost" | string
        Result: "Win" | "Loss" | string
    }
    Metadata?: Record<string, never>
    Data?: {
        Score: number
        OpponentScore: number
        PacifiedNpcs: number
        DisguisesUsed: number
        DisguisesRuined: number
        BodiesHidden: number
        UnnoticedKills: number
        KilledNpcs: number
        Deaths: number
        Duration: number | Date
    }
}

export function calculateMpScore(
    sessionDetails: ContractSession,
): MultiplayerScore {
    if (!sessionDetails.ghost) {
        throw new Error("no mp details on mp session")
    }

    return {
        Header: {
            GameMode: "Ghost",
            Result: sessionDetails.ghost.IsWinner ? "Win" : "Loss",
        },
        Metadata: {},
        Data: {
            Score: sessionDetails.ghost.Score,
            OpponentScore: sessionDetails.ghost.OpponentScore,
            PacifiedNpcs: [...sessionDetails.pacifications].filter(
                (id) =>
                    !sessionDetails.npcKills.has(id) &&
                    !sessionDetails.targetKills.has(id),
            ).length,
            DisguisesUsed: sessionDetails.disguisesUsed.size,
            DisguisesRuined: sessionDetails.disguisesRuined.size,
            BodiesHidden: sessionDetails.bodiesHidden.size,
            UnnoticedKills: sessionDetails.ghost.unnoticedKills,
            KilledNpcs:
                sessionDetails.npcKills.size + sessionDetails.crowdNpcKills,
            Deaths: sessionDetails.ghost.deaths,
            Duration: sessionDetails.duration,
        },
    }
}

export function getMultiplayerLoadoutData(
    userData: UserProfile,
    disguiseUnlockableId: string,
    gameVersion: GameVersion,
) {
    let unlockable = getUnlockableById(disguiseUnlockableId, gameVersion)

    if (!unlockable || unlockable.Type !== "disguise") {
        unlockable = getUnlockableById("TOKEN_OUTFIT_HITMANSUIT", gameVersion)

        assert.ok(unlockable)
    }

    unlockable.GameAsset = null
    unlockable.DisplayNameLocKey = `UI_${unlockable.Id}_NAME`

    return [
        {
            SlotName: "disguise",
            SlotId: "3",
            Recommended: {
                item: {
                    InstanceId: randomUUID(),
                    ProfileId: nilUuid,
                    Unlockable: unlockable,
                    Properties: {},
                },
                type: "disguise",
                owned: true,
            },
        },
    ]
}

export function encodePushMessage<T>(timestamp: bigint, message: T): string {
    const msgstr = JSON.stringify(message)
    const msglength = Buffer.byteLength(msgstr, "utf8")
    let totallength = msglength + 8 + 80 // using a fixed length of 8 for the timestamp for now...
    totallength += 4 - (totallength % 4) // pad to the nearest multiple of 4
    const output = Buffer.alloc(totallength)
    let offset = 0

    offset = output.writeUInt32LE(totallength, offset)
    // no idea what these first two chunks are for
    offset = output.writeUInt32LE(0x0000000c, offset)
    offset = output.writeUInt16LE(0x0008, offset)
    offset = output.writeUInt16LE(0x000e, offset)
    offset = output.writeUInt16LE(0x0007, offset)
    offset = output.writeUInt16LE(0x0008, offset)
    offset = output.writeUInt32LE(0x00000008, offset)
    offset = output.writeUInt32BE(0x00000002, offset)

    offset = output.writeUInt32LE(0x00000014, offset)
    offset = output.writeUInt16LE(0x0000, offset)
    offset = output.writeUInt16LE(0x000e, offset)
    offset = output.writeUInt16LE(0x0014, offset)
    offset = output.writeUInt16LE(0x0006, offset)
    offset = output.writeUInt16LE(0x0000, offset)
    offset = output.writeUInt16LE(0x0005, offset)
    offset = output.writeUInt16LE(0x0008, offset)
    offset = output.writeUInt16LE(0x000c, offset)
    offset = output.writeUInt32LE(0x0000000e, offset)
    offset = output.writeUInt32BE(0x00010300, offset)

    offset = output.writeUInt32LE(0x0c + 8, offset)
    offset = output.writeBigUInt64LE(timestamp, offset)
    offset = output.writeUInt16LE(0x0008, offset)
    offset = output.writeUInt16LE(0x000c, offset)
    offset = output.writeUInt16LE(0x0006, offset)
    offset = output.writeUInt16LE(0x0008, offset)
    offset = output.writeUInt32LE(0x00000008, offset)
    offset = output.writeUInt32BE(0x00008300, offset)

    offset = output.writeUInt32LE(0x04, offset)
    offset = output.writeUInt32LE(msglength, offset)
    offset = output.write(msgstr, offset, "utf8")

    if (PEACOCK_DEV) {
        log(LogLevel.DEBUG, `Encoded message offset: ${offset}`)
    }

    return output.toString("base64")
}
