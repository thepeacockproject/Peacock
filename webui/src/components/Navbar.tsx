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

import * as React from "react"

export interface NavbarProps {
    page: string
    setPage: React.Dispatch<React.SetStateAction<string>>
}

export function Navbar(props: NavbarProps): React.ReactElement {
    return (
        <nav className="navbar">
            <div className="navbar__inner">
                <div className="navbar__items">
                    <a
                        className="navbar__brand"
                        href="#"
                        onClick={() => props.setPage("")}
                    >
                        Peacock
                    </a>
                    <a
                        className="navbar__item navbar__link"
                        href="#"
                        onClick={() => props.setPage("loadouts")}
                    >
                        Loadout Profiles
                    </a>
                    <a
                        className="navbar__item navbar__link"
                        href="#"
                        onClick={() => props.setPage("escalations")}
                    >
                        Escalation Level Picker
                    </a>
                    {WEBUI_IS_DEV ? (
                        <a
                            className="navbar__item navbar__link"
                            href="#"
                            onClick={() => props.setPage("devtools")}
                        >
                            Dev Tools
                        </a>
                    ) : null}
                </div>
            </div>
        </nav>
    )
}
