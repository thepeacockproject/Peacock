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
import useSWR from "swr"
import { baseURL, fetcher, IUser } from "../utils"
import { SelectUser } from "../SelectUser"
import { GameVersionTabs } from "../components/GameVersionTabs"
import { EscalationLevelPicker } from "../EscalationLevelPicker"

export interface CodenameMeta {
    [location: string]: {
        readonly codename: string
        readonly name: string
        /**
         * Escalation group ID.
         */
        readonly id?: string
        readonly isPeacock?: boolean
        readonly hidden?: boolean
    }[]
}

export function EscalationLevelPage() {
    const [user, setUser] = React.useState<string | undefined>(undefined)
    const [gameVersion, setGameVersion] = React.useState<number>(0)
    const { data: codenameData, error: codenamesFetchError } = useSWR(
        `${baseURL}/_wf/codenames`,
        fetcher,
    )
    const { data: userData, error: userFetchError } = useSWR(
        `${baseURL}/_wf/local-users?gv=h${gameVersion}`,
        fetcher,
    )

    if (codenamesFetchError) {
        console.error(codenamesFetchError)
    }

    if (userFetchError) {
        console.error(userFetchError)
    }

    const isReadyToSelectUser = Boolean(
        user === undefined &&
            userData &&
            (userData as { error: string } & IUser[])?.error !== "bad gv",
    )

    function getStatus(): string {
        if (!codenameData) {
            return "Loading escalation data..."
        }

        if (codenameData && gameVersion === 0) {
            return "Select your game version."
        }

        if (isReadyToSelectUser) {
            return "Select the user to modify the progress for."
        }

        return "Choose a level for each escalation."
    }

    return (
        <>
            <header>
                <Hero title="Escalation Level Picker" subtext={getStatus()} />
            </header>

            <main className="container">
                {Boolean(codenameData) && gameVersion === 0 && (
                    <GameVersionTabs
                        gameVersion={gameVersion}
                        setGameVersion={setGameVersion}
                    />
                )}
                {isReadyToSelectUser && (
                    <SelectUser users={userData as IUser[]} setUser={setUser} />
                )}
                {Boolean(codenameData) &&
                    gameVersion !== 0 &&
                    !isReadyToSelectUser &&
                    user && (
                        <EscalationLevelPicker
                            codenames={codenameData as CodenameMeta}
                            gv={gameVersion}
                            user={user!}
                        />
                    )}
            </main>
        </>
    )
}
