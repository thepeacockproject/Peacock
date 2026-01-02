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
import { CodenameMeta } from "./pages/EscalationLevelPage"
import { produce } from "immer"
import { axiosClient, debounce } from "./utils"

export interface EscalationLevelPickerProps {
    codenames: CodenameMeta
    user: string
    gv: number
}

const emptyValue = { __isEmpty: 1 }

type Empty = typeof emptyValue

const locsInGv = [
    // Hitman 2016 (GV 1)
    [
        "ICA Facility",
        "Paris",
        "Sapienza",
        "Marrakesh",
        "Bangkok",
        "Colorado",
        "Hokkaido",
    ],
    // Hitman 2 (GV 2)
    [
        "Hawkes Bay",
        "Miami",
        "Santa Fortuna",
        "Mumbai",
        "Whittleton Creek",
        "Isle of Sgàil",
        "New York",
        "Haven Island",
    ],
    // Hitman 3 (GV 3)
    [
        "Dubai",
        "Dartmoor",
        "Berlin",
        "Chongqing",
        "Mendoza",
        "Carpathian Mountains",
        "Ambrose Island",
        "Elusive Target Arcade",
    ],
]

export function EscalationLevelPicker({
    codenames,
    user,
    gv,
}: EscalationLevelPickerProps) {
    const [saveMessage, setSaveMessage] = React.useState<string | null>(null)
    const [savedProgress, setSavedProgress] =
        React.useState<Record<string, number>>(emptyValue)
    const [modifiedProgress, setModifiedProgress] = React.useState<
        Record<string, number>
    >({})
    const combinedProgress = React.useMemo(() => {
        return { ...savedProgress, ...modifiedProgress }
    }, [modifiedProgress, savedProgress])

    React.useEffect(() => {
        axiosClient
            .get(`/_wf/user-progress`, {
                params: {
                    user,
                    gv: `h${gv}`,
                },
            })
            .then((res) => setSavedProgress(res.data))
            .catch(console.error)
    }, [gv, user])

    // keep refs to the latest data so the debounced saver always uses up-to-date values
    const modifiedProgressRef = React.useRef(modifiedProgress)
    React.useEffect(() => {
        modifiedProgressRef.current = modifiedProgress
    }, [modifiedProgress])

    const userRef = React.useRef(user)
    const gvRef = React.useRef(gv)
    React.useEffect(() => {
        userRef.current = user
        gvRef.current = gv
    }, [user, gv])

    // Since the server saves sent changes are automatically saved every 3 seconds
    // as opposed to whenever the UI passes updated data, there can be a desync
    // between the UI and the server. To fix this, instead of calling the server
    // after every change, use debounce to send a collection of data at most every 3 seconds.
    const saveDebouncedRef = React.useRef<() => void>(() => {})
    React.useEffect(() => {
        saveDebouncedRef.current = debounce(() => {
            axiosClient
                .get(`/_wf/modify`, {
                    params: {
                        user: userRef.current,
                        gv: `h${gvRef.current}`,
                        escalations: JSON.stringify(
                            modifiedProgressRef.current,
                        ),
                    },
                })
                .then((value) => {
                    let message: string

                    if (value.data.success) {
                        message = "Changes made."
                        setSavedProgress((prev) => ({
                            ...prev,
                            ...modifiedProgressRef.current,
                        }))
                        setSaveMessage("Changes saved!")
                    } else {
                        message = "Error: " + value.data.error
                        alert(message)
                        setModifiedProgress({})
                        setSaveMessage("Saving changes failed.")
                    }

                    return console.debug(message)
                })
                .catch(console.error)
        }, 3000)
    }, [])

    if ((savedProgress as Empty).__isEmpty === 1) {
        return <p>Loading user details...</p>
    }

    function onChange(id: string, value: number): void {
        setSaveMessage("Saving...")

        let fork = modifiedProgress

        fork = produce(fork, (draft) => {
            if (!fork[id]) {
                draft[id] = 1
            }

            draft[id] = value
        })

        setModifiedProgress(fork)

        saveDebouncedRef.current()
    }

    const final: Record<string, React.ReactElement[][]> = {}
    const locsInGame = locsInGv.slice(0, gv).flat()

    for (const location in codenames) {
        if (!locsInGame.includes(location)) {
            continue
        }

        const rows: React.ReactElement[][] = [[]]
        let latestRow = 0

        for (const codename of codenames[location]) {
            if (
                !codename.id ||
                codename.hidden ||
                (gv === 1 && codename.isPeacock)
            ) {
                continue
            }

            const comp = (
                <div className="col col--4" key={codename.codename}>
                    <div className="card" style={{ padding: "5px" }}>
                        <div className="card__header centered">
                            <h3>{codename.name}</h3>
                        </div>
                        <div className="card__body">
                            <ul className="tabs">
                                <li className="tabs__item elp-tab">
                                    <button
                                        className="button button--sm button--danger"
                                        disabled={
                                            !combinedProgress[codename.id!] ||
                                            combinedProgress[codename.id!] === 1
                                        }
                                        onClick={() =>
                                            onChange(
                                                codename.id!,
                                                combinedProgress[codename.id!] -
                                                    1,
                                            )
                                        }
                                    >
                                        -
                                    </button>
                                </li>
                                <li className="tabs__item elp-tab">
                                    <p className="elp-tab">
                                        {`Current level:  ${combinedProgress[codename.id!] ?? 1}/${codename.levels}`}
                                    </p>
                                </li>
                                <li className="tabs__item elp-tab">
                                    <button
                                        className="button button--sm button--success"
                                        disabled={
                                            combinedProgress[codename.id!] >=
                                            (codename.levels ?? 5)
                                        }
                                        onClick={() =>
                                            onChange(
                                                codename.id!,
                                                (combinedProgress[
                                                    codename.id!
                                                ] ?? 1) + 1,
                                            )
                                        }
                                    >
                                        +
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            )

            if (rows[latestRow].length === 3) {
                latestRow = latestRow + 1
                rows.push([])
            }

            rows[latestRow].push(comp)
        }

        if (rows[0].length) final[location] = rows
    }

    return (
        <section className="app-grid">
            {saveMessage !== null && (
                <div
                    className="save-indicator alert alert--primary"
                    role="alert"
                >
                    <button
                        aria-label="Close"
                        className="clean-btn close"
                        type="button"
                        onClick={() => setSaveMessage(null)}
                    >
                        <span aria-hidden="true">&times;</span>
                    </button>

                    <span>{saveMessage}</span>
                </div>
            )}

            {Object.keys(final).map((val) => {
                return (
                    <div
                        className="container"
                        style={{ padding: "15px" }}
                        key={val}
                    >
                        <h1>{val}</h1>
                        {final[val].map((row, index) => (
                            <div className="row" key={index}>
                                {row}
                            </div>
                        ))}
                    </div>
                )
            })}
        </section>
    )
}
