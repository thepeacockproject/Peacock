/*
 *     The Peacock Project - a HITMAN server replacement.
 *     Copyright (C) 2021-2024 The Peacock Project Team
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

import { ContractSession } from "../types/types"

const SESSION_SET_PROPS: (keyof ContractSession)[] = [
    "targetKills",
    "npcKills",
    "bodiesHidden",
    "pacifications",
    "disguisesUsed",
    "disguisesRuined",
    "spottedBy",
    "witnesses",
    "bodiesFoundBy",
    "killsNoticedBy",
    "completedObjectives",
    "kills",
    "markedTargets",
    "failedObjectives",
]

const SESSION_MAP_PROPS: (keyof ContractSession)[] = [
    "objectiveStates",
    "objectiveContexts",
    "objectiveDefinitions",
]

/**
 * Prepares a contract session for saving to a file.
 *
 * @param session The ContractSession.
 */
export function serializeSession(session: ContractSession): unknown {
    const o: Partial<ContractSession> = {}

    type K = keyof ContractSession

    // obj clone
    for (const key of Object.keys(session)) {
        if (session[key as K] instanceof Map) {
            // @ts-expect-error Type mismatch.
            o[key] = Array.from(
                (session[key as K] as Map<string, unknown>).entries(),
            )
            continue
        }

        if (session[key as K] instanceof Set) {
            // @ts-expect-error Type mismatch.
            o[key] = Array.from(session[key])
            continue
        }

        // @ts-expect-error Type mismatch.
        o[key] = session[key as K]
    }

    return o
}

/**
 * Changes all ContractSession array items into sets.
 *
 * @param saved The ContractSession.
 */
export function deserializeSession(
    saved: Record<string, unknown>,
): ContractSession {
    const session: Partial<ContractSession> = {}

    // obj clone
    for (const key of Object.keys(saved)) {
        // @ts-expect-error Type mismatch.
        session[key] = saved[key]
    }

    for (const collection of SESSION_SET_PROPS) {
        // @ts-expect-error Type mismatch.
        session[collection] = new Set(session[collection])
    }

    for (const map of SESSION_MAP_PROPS) {
        if (session[map]) {
            // @ts-expect-error Type mismatch.
            session[map] = new Map(session[map])
        }
    }

    return <ContractSession>session
}
