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

import * as React from "react"
import clsx from "clsx"

export interface GameVersionTabsProps {
    gameVersion: number
    setGameVersion: React.Dispatch<React.SetStateAction<number>>
}

export function GameVersionTabs(props: GameVersionTabsProps) {
    const { gameVersion, setGameVersion } = props

    return (
        <ul className="tabs body-centered">
            <li
                className={clsx(
                    "tabs__item",
                    gameVersion === 1 && "tabs__item--active",
                )}
                onClick={() => setGameVersion(1)}
            >
                HITMAN&trade;
            </li>
            <li
                className={clsx(
                    "tabs__item",
                    gameVersion === 2 && "tabs__item--active",
                )}
                onClick={() => setGameVersion(2)}
            >
                HITMAN&trade; 2
            </li>
            <li
                className={clsx(
                    "tabs__item",
                    gameVersion === 3 && "tabs__item--active",
                )}
                onClick={() => setGameVersion(3)}
            >
                HITMAN&trade; 3
            </li>
        </ul>
    )
}
