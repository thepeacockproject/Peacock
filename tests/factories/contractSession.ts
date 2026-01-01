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

import { factory } from "@rdil/factorygirl"
import {
    ContractSession,
    PeacockCameraStatus,
} from "../../components/types/types"
import { contractFactory } from "./contract"

export const contractSessionFactory = factory<ContractSession, "">(() => {
    const contract = contractFactory()

    return {
        Id: "fakeSessionId",
        gameVersion: "h3",
        sessionStart: 1234,
        lastUpdate: 1234,
        contractId: contract.Metadata.Id,
        userId: "1273f7aa-e53b-4446-b940-0c32430dec0c", // STUB
        timerStart: 0,
        timerEnd: 0,
        duration: 0,
        crowdNpcKills: 0,
        targetKills: new Set(),
        npcKills: new Set(),
        bodiesHidden: new Set(),
        pacifications: new Set(),
        disguisesUsed: new Set(),
        disguisesRuined: new Set(),
        spottedBy: new Set(),
        witnesses: new Set(),
        bodiesFoundBy: new Set(),
        legacyHasBodyBeenFound: false,
        killsNoticedBy: new Set(),
        completedObjectives: new Set(),
        failedObjectives: new Set(),
        recording: PeacockCameraStatus.NotSpotted,
        lastAccident: 0,
        lastKill: {},
        kills: new Set(),
        compat: true,
        markedTargets: new Set(),
        currentDisguise: "4fc9396e-2619-4e66-a51e-2bd366230da7", // sig suit
        difficulty: 2,
        objectiveContexts: new Map(),
        objectiveStates: new Map(),
        objectives: new Map(),
        ghost: {
            deaths: 0,
            unnoticedKills: 0,
            Opponents: [],
            OpponentScore: 0,
            Score: 0,
            IsDraw: false,
            IsWinner: false,
            timerEnd: null,
        },
        challengeContexts: {},
        silentAssassinLost: false,
    }
})
