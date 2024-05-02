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

import { Hero } from "../components/Hero"
import * as React from "react"
import useSWR from "swr"
import { baseURL, BasicUser, fetcher } from "../utils"
import { GameVersionTabs } from "../components/GameVersionTabs"
import { SelectUser } from "../components/SelectUser"
import { TransferDetails } from "../TransferDetails"

export function TransferPage() {
    const [user, setUser] = React.useState<string | undefined>(undefined)
    const [gameVersion, setGameVersion] = React.useState<number>(0)
    const { data: userData, error: userFetchError } = useSWR(
        `${baseURL}/_wf/local-users?gv=h${gameVersion}`,
        fetcher,
    )

    if (userFetchError) {
        console.error(userFetchError)
    }

    const isReadyToSelectUser = Boolean(
        gameVersion !== 0 &&
            user === undefined &&
            userData &&
            (userData as { error: string } & BasicUser[])?.error !== "bad gv",
    )

    function getStatus(): string {
        if (gameVersion === 0) {
            return "Select your game version."
        }

        if (isReadyToSelectUser) {
            return "Select target user profile."
        }

        return ""
    }

    return (
        <>
            <header>
                <Hero
                    title="Official Server Transfer Tool"
                    subtext={getStatus()}
                />
            </header>

            <main className="container">
                {gameVersion === 0 && (
                    <GameVersionTabs
                        gameVersion={gameVersion}
                        setGameVersion={setGameVersion}
                    />
                )}
                {isReadyToSelectUser && (
                    <SelectUser
                        users={userData as BasicUser[]}
                        setUser={setUser}
                    />
                )}
                {gameVersion !== 0 &&
                    !isReadyToSelectUser &&
                    user &&
                    userData && (
                        <TransferDetails
                            gv={`h${gameVersion as 1 | 2 | 3}`}
                            user={
                                (userData as BasicUser[]).find(
                                    (u) => u.id === user,
                                )!
                            }
                        />
                    )}
            </main>
        </>
    )
}
