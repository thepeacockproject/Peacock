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
import { Hero } from "../components/Hero"
import "./DevToolsPage.css"
import { sort } from "json-keys-sort"

export function DevToolsPage() {
    const [jsonText, setJsonText] = React.useState<string>("")
    const [statusText, setStatusText] = React.useState<string>("")

    return (
        <>
            <header>
                <Hero
                    title="Development Tools"
                    subtext="Tools for working on Peacock."
                />
            </header>

            <main className="container">
                <h2 className="upper-space">JSON Key Sorter</h2>

                <textarea
                    className="text-field"
                    value={jsonText}
                    aria-multiline={true}
                    onChange={(event) => setJsonText(event.target.value)}
                ></textarea>

                {statusText ? (
                    <div
                        className="alert alert--danger bottom-space"
                        role="alert"
                    >
                        <button
                            aria-label="Close"
                            className="clean-btn close"
                            type="button"
                            onClick={() => setStatusText("")}
                        >
                            <span aria-hidden="true">&times;</span>
                        </button>
                        {statusText}
                    </div>
                ) : null}

                <button
                    className="button button--primary"
                    onClick={() => {
                        try {
                            const json = JSON.parse(jsonText)

                            const output = sort(json)

                            setJsonText(JSON.stringify(output, undefined, 4))
                        } catch (e) {
                            setStatusText((e as Error)?.message)
                        }
                    }}
                >
                    Sort
                </button>
            </main>
        </>
    )
}
