/*
 *     The Peacock Project - a HITMAN server replacement.
 *     Copyright (C) 2021-2022 The Peacock Project Team
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
import { EscalationGroup } from "./pages/EscalationLevelPage"
import { produce } from "immer"
import { axiosClient } from "./utils"

export interface EscalationLevelPickerProps {
    codenames: { [id: string]: EscalationGroup }
    user: string
    gv: number
}

const emptyValue = { __isEmpty: 1 }

type Empty = typeof emptyValue

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

    //#region Bootleg column paginator
    const rows: React.ReactElement[][] = [[]]
    let latestRow = 0
    for (const id in codenames) {
        if (codenames[id].codename === undefined) {
            codenames[id].codename = id
        }
        if (codenames[id].name === undefined) {
            codenames[id].name = id
        }
        const comp = (
            <div className="col col--4" key={codenames[id].codename}>
                <div className="card">
                    <div className="card__header">
                        <h3>{codenames[id].name}</h3>
                    </div>
                    <div className="card__body">
                        <ul className="tabs">
                            <li className="tabs__item elp-tab">
                                <button
                                    className="button button--sm button--danger"
                                    onClick={() => onChange(id!, "-")}
                                >
                                    -
                                </button>
                            </li>
                            <li className="tabs__item elp-tab">
                                <p className="elp-tab">
                                    Current level: {progress[id!] ?? 1}
                                </p>
                            </li>
                            <li className="tabs__item elp-tab">
                                <button
                                    className="button button--sm button--success"
                                    onClick={() => onChange(id!, "+")}
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
    //#endregion

    return (
        <section className="app-grid">
            <div className="container">
                {rows.map((row, index) => (
                    <div className="row" key={index}>
                        {row}
                    </div>
                ))}
            </div>
        </section>
    )
}
