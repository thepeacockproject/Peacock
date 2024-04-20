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
import { axiosClient, BasicUser } from "./utils"
import { TransferAlert } from "./TransferAlert"

type TransferDetailsProps = {
    user: BasicUser
    gv: "h1" | "h2" | "h3"
}

function InProgressAlert() {
    return (
        <div className="alert alert--primary" role="alert">
            Performing the transfer, this may take a bit...
        </div>
    )
}

function TransferSuccessfulAlert() {
    return (
        <div className="alert alert--success" role="alert">
            Transfer completed successfully!
        </div>
    )
}

function TransferErrorAlert({ error }: { error: string }) {
    return (
        <div className="alert alert--danger" role="alert">
            Failed to perform transfer. {error}
        </div>
    )
}

export function TransferDetails({ user, gv }: TransferDetailsProps) {
    const [fetching, setFetching] = React.useState<boolean>(false)
    const [error, setError] = React.useState<string | null>(null)
    const [lastSucceeded, setLastSucceeded] = React.useState<boolean | null>(
        null,
    )

    const doSync = React.useCallback(async () => {
        try {
            const resp = await axiosClient.post(
                "/_wf/sync-progress",
                {},
                {
                    params: {
                        gv,
                        user: user.id,
                    },
                },
            )

            if (resp.data.success) {
                setFetching(false)
                setLastSucceeded(true)
                setError(null)
            } else {
                setFetching(false)
                setLastSucceeded(false)
                setError(resp.data.error)
            }
        } catch (e) {
            console.error(e)
            setFetching(false)
            setError("Failed to perform internal request to begin transfer.")
            setLastSucceeded(false)
        }
    }, [gv, user.id])

    return (
        <div className={"margin-top"}>
            <p>
                Selected profile: {user.name} ({user.platform})
            </p>
            <p>Last official server sync: {user.lastOfficialSync || "never"}</p>

            {fetching ? <InProgressAlert /> : null}

            {lastSucceeded === true ? <TransferSuccessfulAlert /> : null}

            {lastSucceeded === false && error ? (
                <TransferErrorAlert error={error} />
            ) : null}

            <TransferAlert
                trigger={
                    <button className={"button button--success"}>
                        Sync Now
                    </button>
                }
                doSync={doSync}
            />
        </div>
    )
}
