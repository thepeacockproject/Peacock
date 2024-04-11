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

import * as React from "react"
import { Link } from "react-router-dom"

export function Navbar(): React.ReactElement {
    return (
        <nav className="navbar">
            <div className="navbar__inner">
                <div className="navbar__items">
                    <Link className="navbar__brand" to="/">
                        Peacock
                    </Link>
                    <Link
                        className="navbar__item navbar__link"
                        to="/ui/loadouts"
                    >
                        Loadout Profiles
                    </Link>
                    <Link
                        className="navbar__item navbar__link"
                        to="/ui/escalations"
                    >
                        Escalation Level Picker
                    </Link>
                    <Link
                        className="navbar__item navbar__link"
                        to="/ui/transfer"
                    >
                        Progress Transfer
                    </Link>
                    {WEBUI_IS_DEV ? (
                        <Link
                            className="navbar__item navbar__link"
                            to="/ui/devtools"
                        >
                            Dev Tools
                        </Link>
                    ) : null}
                </div>
            </div>
        </nav>
    )
}
