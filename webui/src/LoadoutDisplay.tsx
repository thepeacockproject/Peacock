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
import useSWR from "swr"
import {
    axiosClient,
    baseURL,
    fetcher,
    Loadout,
    LoadoutsGameVersion,
} from "./utils"
import { LoadoutPreview } from "./LoadoutPreview"

/**
 * Shared type with @peacockproject/core.
 */
interface LoadoutFile {
    h1: LoadoutsGameVersion
    h2: LoadoutsGameVersion
    h3: LoadoutsGameVersion
}

export interface LoadoutDisplayProps {
    loadoutName: string
    loadoutId: string
    gameVersion: 1 | 2 | 3
    backFunction: (isRemoving?: boolean) => void
}

export function LoadoutDisplay(props: LoadoutDisplayProps): React.ReactElement {
    const { data, error } = useSWR(`${baseURL}/loadouts/all-loadouts`, fetcher)
    const [name, setName] = React.useState<string>("")
    const [isCurrent, setIsCurrent] = React.useState<boolean>(false)

    const gameVerString: "h1" | "h2" | "h3" = React.useMemo(() => {
        switch (props.gameVersion) {
            case 1:
                return "h1"
            case 2:
                return "h2"
            default:
                return "h3"
        }
    }, [props.gameVersion])

    React.useEffect(() => {
        const loadoutsForVersion: Loadout[] = (data as LoadoutFile)[
            `h${props.gameVersion}`
        ].loadouts

        const theLoadout = loadoutsForVersion.find(
            (loadout) => loadout.id === props.loadoutId,
        )

        setName(theLoadout?.name ?? "unknown")
        setIsCurrent(
            (data as LoadoutFile)[`h${props.gameVersion}`].selected ===
                theLoadout?.id,
        )
    }, [data, props.gameVersion, props.loadoutName, props.loadoutId])

    const id = props.loadoutId

    if (error) {
        console.error(error)
    }

    if (!data) {
        return <p>Loading...</p>
    }

    const loadoutsForVersion: Loadout[] = (data as LoadoutFile)[
        `h${props.gameVersion}`
    ].loadouts

    const theLoadout = loadoutsForVersion.find((loadout) => loadout.id === id)

    if (!theLoadout) {
        return <p>An error occurred. Please try again later.</p>
    }

    const index = loadoutsForVersion.indexOf(theLoadout)

    function mutate(): true {
        const d2 = { ...(data as LoadoutFile) }

        d2[gameVerString]!.loadouts[index].name = name!

        // equip current loadout
        d2[gameVerString]!.selected = id!

        axiosClient.patch("/loadouts/update", d2)
        return true
    }

    async function deleteThisLoadout(): Promise<void> {
        await axiosClient.patch("/loadouts/remove", {
            gameVersion: gameVerString,
            id: theLoadout!.id,
        })
        return props.backFunction(true)
    }

    return (
        <div>
            <button
                className="button button--secondary margin-top"
                onClick={() => props.backFunction(false)}
            >
                « Back
            </button>

            <section className="app-grid">
                <button
                    className={`button button--block button--success${
                        isCurrent ? " disabled" : ""
                    }`}
                    onClick={() => {
                        setIsCurrent(true)
                        mutate()
                    }}
                >
                    {isCurrent ? "Already Equipped!" : "Equip Loadout Profile"}
                </button>

                <div className="special-card margin-top">
                    <div className="card">
                        <div className="card__header">
                            <h3>Profile Name</h3>
                        </div>
                        <div className="card__body">
                            <input
                                style={{ width: "100%" }}
                                className="input"
                                value={name}
                                onChange={(newValue) =>
                                    setName(newValue.target.value)
                                }
                                placeholder={name}
                            />
                        </div>
                        <div className="card__footer">
                            <button
                                className="button button--success button--block"
                                onClick={() => mutate() && props.backFunction()}
                            >
                                Rename
                            </button>
                        </div>
                    </div>
                </div>

                <div className="special-card margin-top">
                    <div className="card">
                        <div className="card__header">
                            <h3>Delete Profile</h3>
                        </div>
                        <div className="card__body">
                            <p>Warning: this cannot be undone!</p>
                        </div>
                        <div className="card__footer">
                            <button
                                className="button button--danger button--block"
                                onClick={deleteThisLoadout}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>

                <div className="special-card margin-top">
                    <div className="card">
                        <div className="card__header">
                            <h3>Preview</h3>
                        </div>
                        <div className="card__body">
                            <LoadoutPreview loadout={theLoadout.data} />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
