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

import { Playstyle } from "./types/scoring"
import { RatingKill } from "./types/types"
import { getConfig } from "./configSwizzleManager"

/**
 * Checks the criteria of each possible play-style, ranking them by scoring.
 *
 * @author CurryMaker
 * @param session The contract session.
 * @returns The play-styles, ranked from best fit to worst fit.
 */
// TODO: This could use an update with more playstyles
export function calculatePlaystyle(
    session: Partial<{ kills: Set<RatingKill> }>,
): Playstyle[] {
    const playstylesCopy = getConfig("Playstyles", true) as Playstyle[]

    // Resetting the scores...
    playstylesCopy.forEach((p) => {
        p.Score = 0
    })

    const doneWeaponTypes: string[] = []
    const doneKillMethods: string[] = []
    const doneAccidents: string[] = []

    session.kills.forEach((k) => {
        if (k.KillClass === "ballistic") {
            if (k.KillItemCategory === "pistol") {
                playstylesCopy[1].Score += 6000
            }

            if (k.IsHeadshot) {
                playstylesCopy[0].Score += 6000
            } else {
                playstylesCopy[0].Score -= 2000
            }

            if (doneWeaponTypes.includes(k.KillItemCategory)) {
                playstylesCopy[2].Score -= 2000
            } else {
                playstylesCopy[2].Score += 6000
                doneWeaponTypes.push(k.KillItemCategory)
            }

            if (k.KillItemCategory === "shotgun") {
                playstylesCopy[7].Score += 6000
            }

            if (k.KillItemCategory === "assaultrifle") {
                playstylesCopy[9].Score += 6000
            }

            if (k.KillItemCategory === "sniperrifle") {
                playstylesCopy[10].Score += 6000
            }

            if (k.KillItemCategory === "smg") {
                playstylesCopy[15].Score += 6000
            }
        } else if (k.KillClass === "melee") {
            if (
                k.KillMethodBroad === "accident" &&
                k.KillItemCategory === undefined
            ) {
                playstylesCopy[4].Score += 6000
            }

            if (k.KillMethodStrict === "fiberwire") {
                playstylesCopy[13].Score += 6000
            }

            if (k.KillMethodBroad === "unarmed") {
                playstylesCopy[16].Score += 6000
            }

            if (k.KillMethodStrict === "accident_drown") {
                playstylesCopy[6].Score += 6000
            }

            if (k.KillMethodBroad === "accident") {
                if (doneAccidents.includes(k.KillMethodStrict)) {
                    playstylesCopy[8].Score -= 2000
                } else {
                    playstylesCopy[8].Score += 6000
                    doneAccidents.push(k.KillMethodStrict)
                }
            }

            playstylesCopy[5].Score += 6000
        } else if (k.KillClass === "explosion") {
            if (k.KillMethodBroad === "explosive") {
                playstylesCopy[12].Score += 6000
            }

            if (k.KillMethodBroad === "accident") {
                playstylesCopy[19].Score += 6000
            }
        } else if (k.KillClass === "unknown") {
            if (k.KillMethodStrict === "accident_electric") {
                playstylesCopy[11].Score += 6000
            }

            if (k.KillMethodStrict === "accident_suspended_object") {
                playstylesCopy[14].Score += 6000
            }

            if (k.KillMethodStrict === "accident_burn") {
                playstylesCopy[18].Score += 6000
            }

            if (doneAccidents.includes(k.KillMethodStrict)) {
                playstylesCopy[8].Score -= 2000
            } else {
                playstylesCopy[8].Score += 6000
                doneAccidents.push(k.KillMethodStrict)
            }
        } else if (k.KillClass === "poison") {
            playstylesCopy[17].Score += 6000
        }

        if (doneKillMethods.includes(k.KillClass)) {
            playstylesCopy[3].Score -= 2000
        } else {
            playstylesCopy[3].Score += 6000
            doneKillMethods.push(k.KillClass)
        }
    })

    playstylesCopy.sort((a, b) => {
        if (a.Score > b.Score) {
            return -1
        }

        return b.Score > a.Score ? 1 : 0
    })

    return playstylesCopy
}
