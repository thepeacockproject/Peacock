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
import { IUser } from "./utils"

export interface SelectUserProps {
    users: IUser[]
    setUser: React.Dispatch<React.SetStateAction<string | undefined>>
}

export function SelectUser({
    users,
    setUser,
}: SelectUserProps): React.ReactElement {
    if (users.length === 0) {
        return (
            <section className="margin-top">
                <p className="body-centered flex">
                    No users detected on this game version!
                </p>
            </section>
        )
    }

    return (
        <section className="margin-top">
            <nav className="pagination-nav">
                {users.map((user) => (
                    <div className="pagination-nav__item" key={user.id}>
                        <button
                            className="pagination-nav__link"
                            onClick={() => setUser(user.id)}
                        >
                            <div className="pagination-nav__sublabel centered">
                                {user.platform}
                            </div>
                            <div className="pagination-nav__label centered">
                                {user.name ?? "No Name Found"}
                            </div>
                        </button>
                    </div>
                ))}
            </nav>
        </section>
    )
}
