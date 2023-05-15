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

import { IContextListener } from "../statemachines/contextListeners"

export type Playstyle = {
    Id: string
    Name: string
    Type: string
    Comment?: string
    Score: number
}

export type ScoringBonus = {
    Score: number
    Id: string
    FractionNumerator: number
    FractionDenominator: number
}

export type ScoringHeadline = {
    headline: string
    type: string
    count: string
    scoreIsFloatingType: boolean
    fractionNumerator: number
    fractionDenominator: number
    scoreTotal: number
}

export type ManifestScoringModule =
    | ScoringModule & {
          Type: string
      }

export type ManifestScoringDefinition = {
    ContextListeners?: null | Record<string, IContextListener<never>>
    ScoreEvents?: {
        [name: string]: {
            type: number
            text: string
        }
    }
    States?: Record<string, unknown>
    Constants?: Record<string, unknown>
    Context?: Record<string, unknown | string[] | string>
}

export type ScoringModule = {
    score?: number
    maxtime?: number
    multiplier?: number
    penalty?: number
    Unlockables?: string[]
    ScoringDefinitions?: ManifestScoringDefinition[]
}
