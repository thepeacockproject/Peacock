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

export interface HeroProps {
    title: string
    subtext?: string
}

export function Hero(props: HeroProps): React.ReactElement {
    return (
        <div className="hero hero--primary shadow--lw">
            <div className="container">
                <h1 className="hero__title centered">{props.title}</h1>
                {props.subtext ? (
                    <p className="hero__subtitle centered">{props.subtext}</p>
                ) : null}
            </div>
        </div>
    )
}
