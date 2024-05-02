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

import axios from "axios"
import type { SWRConfiguration } from "swr"

type AxiosMethod = "get" | "post" | "patch" | "put"

const parsedUrl = new URL(window.location.href)
export const baseURL = WEBUI_IS_DEV
    ? "http://localhost:80"
    : `${parsedUrl.protocol}`

export const axiosClient = axios.create({
    baseURL,
})

export const fetcher: SWRConfiguration = {
    fetcher: (url: string, method: AxiosMethod = "get") =>
        axios[method](url).then((res) => res.data),
}

/**
 * Shared type with @peacockproject/core.
 */
export interface Loadout {
    /**
     * Random ID.
     *
     * @since Peacock v5
     */
    id?: string
    name: string
    data: {
        [locationName: string]: {
            readonly 2?: string
            readonly 3?: string
            readonly 4?: string
        } & { [briefcaseId: string]: string }
    }
}

export type BasicUser = Readonly<{
    id: string
    name: string
    platform: string
    lastOfficialSync: string | null
}>

export interface LoadoutsGameVersion {
    selected: string
    loadouts: Loadout[]
}
