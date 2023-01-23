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

import * as React from "react"
import "infima/dist/css/default/default.css"
import "./App.css"
import { Navbar } from "./components/Navbar"
import { LoadoutPage } from "./pages/LoadoutPage"
import { Home } from "./pages/Home"
import { EscalationLevelPage } from "./pages/EscalationLevelPage"
import { DevToolsPage } from "./pages/DevToolsPage"

export function App(): React.ReactElement {
    const [page, setPage] = React.useState<string>("")

    return (
        <>
            <header>
                <Navbar page={page} setPage={setPage} />
            </header>
            {!page || page === "" ? <Home /> : null}
            {page === "loadouts" && <LoadoutPage />}
            {page === "escalations" && <EscalationLevelPage />}
            {WEBUI_IS_DEV && page === "devtools" && <DevToolsPage />}
        </>
    )
}
