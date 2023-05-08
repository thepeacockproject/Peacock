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
import { CodenameMeta } from "./pages/EscalationLevelPage"
import { produce } from "immer"
import { axiosClient } from "./utils"

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
    const [progress, setProgressWeb] =
        React.useState<Record<string, number>>(emptyValue)

    React.useEffect(() => {
        axiosClient
            .get(`/_wf/user-progress`, {
                params: {
                    user,
                    gv: `h${gv}`,
                },
            })
            .then((res) => setProgressWeb(res.data))
            .catch(console.error)
    }, [gv, user])

    if (
        Object.keys(progress).length === 0 &&
        (progress as Empty).__isEmpty !== 1
    ) {
        return <p>Loading user details...</p>
    }

    function onChange(id: string, op: string): void {
        let fork = progress

        fork = produce(fork, (draft) => {
            if (!fork[id]) {
                draft[id] = 1
            }

            draft[id] = op === "+" ? draft[id] + 1 : draft[id] - 1
        })

        axiosClient
            .get(`/_wf/modify`, {
                params: {
                    id,
                    user,
                    gv: `h${gv}`,
                    level: fork[id],
                },
            })
            .then((value) => {
                let message: string

                if (value.data.success) {
                    message = "Changes made. "
                    setProgressWeb(fork)
                } else {
                    message = "Error: " + value.data.error
                    alert(message)
                }

                return console.debug(message)
            })
            .catch(console.error)
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
                                        onClick={() =>
                                            onChange(codename.id!, "-")
                                        }
                                    >
                                        -
                                    </button>
                                </li>
                                <li className="tabs__item elp-tab">
                                    <p className="elp-tab">
                                        Current level:{" "}
                                        {progress[codename.id!] ?? 1}
                                    </p>
                                </li>
                                <li className="tabs__item elp-tab">
                                    <button
                                        className="button button--sm button--success"
                                        onClick={() =>
                                            onChange(codename.id!, "+")
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
            {Object.keys(final).map((val) => {
                return (
                    <div className="container" style={{ padding: "15px" }}>
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
