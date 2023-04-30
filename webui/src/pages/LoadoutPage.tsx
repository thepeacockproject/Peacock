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
import { Hero } from "../components/Hero"
import { LoadoutDisplay } from "../LoadoutDisplay"
import { GameVersionTabs } from "../components/GameVersionTabs"
import { LoadoutsForGameVersion } from "../LoadoutsForGameVersion"

export function LoadoutPage() {
    const [activeGameVersion, setActiveGameVersion] = React.useState(0)
    const [activeEditingName, setActiveEditingName] = React.useState<
        string | undefined
    >(undefined)
    const [activeEditingId, setActiveEditingId] = React.useState<
        string | undefined
    >(undefined)
    const [, setForceReload] = React.useState<number>(0)

    if (activeEditingName !== undefined && activeEditingId !== undefined) {
        return (
            <>
                <header>
                    <Hero
                        title={`Editing ${activeEditingName}`}
                        subtext="You may select the changes you would like to make below."
                    />
                </header>

                <main className="container">
                    <LoadoutDisplay
                        gameVersion={activeGameVersion as 1 | 2 | 3}
                        loadoutName={activeEditingName}
                        loadoutId={activeEditingId}
                        backFunction={(isRemoving = false) => {
                            setActiveEditingName(void 0)

                            if (isRemoving) {
                                setForceReload(Math.random() * Math.random())
                            }
                        }}
                    />
                </main>
            </>
        )
    }

    return (
        <>
            <header>
                <Hero title="Loadout Profiles" />
            </header>

            <main className="container">
                <GameVersionTabs
                    gameVersion={activeGameVersion}
                    setGameVersion={setActiveGameVersion}
                />

                {activeGameVersion === 0 ? (
                    <p className="subTitle centered">
                        Select a game version to get started!
                    </p>
                ) : (
                    <LoadoutsForGameVersion
                        gameVersion={activeGameVersion}
                        setActiveEditing={setActiveEditingName}
                        setActiveEditingId={setActiveEditingId}
                    />
                )}
            </main>
        </>
    )
}
