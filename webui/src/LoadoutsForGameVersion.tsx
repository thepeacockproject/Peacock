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
import useSWR from "swr"
import {
    axiosClient,
    baseURL,
    fetcher,
    Loadout,
    LoadoutsGameVersion,
} from "./utils"

export interface LoadoutsForGameVersionProps {
    gameVersion: number
    setActiveEditing: React.Dispatch<React.SetStateAction<string | undefined>>
    setActiveEditingId: React.Dispatch<React.SetStateAction<string | undefined>>
}

export function LoadoutsForGameVersion({
    gameVersion,
    setActiveEditing,
    setActiveEditingId,
}: LoadoutsForGameVersionProps): React.ReactElement {
    const [didClickCreate, setDidClickCreate] = React.useState(false)
    const { data, error, mutate } = useSWR(
        `${baseURL}/loadouts/all-loadouts`,
        fetcher,
    )

    if (error) {
        console.error(error)
    }

    if (!data) {
        return <p>Loading...</p>
    }

    // note: putting these 2 consts together make intellij and prettier conflict each other
    const theGameVer = data[`h${gameVersion}`] as LoadoutsGameVersion

    const loadoutsForVersion: Loadout[] = theGameVer.loadouts

    return (
        <section className="margin-top">
            <nav className="pagination-nav">
                {loadoutsForVersion.map((loadout) => {
                    const isActive =
                        data[`h${gameVersion}`].selected === loadout.id

                    return (
                        <div className="pagination-nav__item" key={loadout.id}>
                            <button
                                className="pagination-nav__link"
                                onClick={() => {
                                    setActiveEditing(loadout.name)
                                    setActiveEditingId(loadout.id)
                                }}
                            >
                                <div className="pagination-nav__sublabel centered">
                                    Click to view details and actions
                                </div>
                                <div className="pagination-nav__label centered">
                                    {`${loadout.name} `}
                                    {isActive && (
                                        <span className="badge badge--success">
                                            Selected!
                                        </span>
                                    )}
                                </div>
                            </button>
                        </div>
                    )
                })}
                <div
                    className="pagination-nav__item"
                    key="__loadouts.CREATENEW"
                >
                    <button
                        className="pagination-nav__link"
                        disabled={didClickCreate}
                        onClick={async () => {
                            setDidClickCreate(true)
                            await axiosClient.post("/loadouts/create", {
                                gameVersion: `h${gameVersion}`,
                            })
                            await mutate()
                            setDidClickCreate(false)
                        }}
                    >
                        <div className="pagination-nav__sublabel centered">
                            Create new loadout profile
                        </div>
                        <div className="pagination-nav__label centered">
                            {didClickCreate ? "Processing..." : "+"}
                        </div>
                    </button>
                </div>
            </nav>
        </section>
    )
}
