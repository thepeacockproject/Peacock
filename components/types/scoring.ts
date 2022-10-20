/*
 *     The Peacock Project - a HITMAN server replacement.
 *     Copyright (C) 2021-2022 The Peacock Project Team
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
