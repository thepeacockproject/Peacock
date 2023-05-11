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

import axios, { AxiosResponse } from "axios"
import type { Request } from "express"
import { log, LogLevel } from "./loggingInterop"
import { handleAxiosError } from "./utils"
import type { GameVersion } from "./types/types"

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Creates the body for the authentication request (urlencoded format).
 *
 * @param params The parameters object.
 * @returns The urlencoded body.
 */
function createUrlencodedBody(params: Record<string, string>): string {
    let out = ""

    Object.keys(params).forEach((value, index) => {
        if (index !== 0) {
            out += "&"
        }

        out += `${value}=${params[value]}`
    })

    return out
}

const requestHeadersH3 = {
    "User-agent": "G2 Http/1.0 (Windows NT 10.0; DX12/1; d3d12/1)",
    Version: "8.12.0",
}

const requestHeadersH2 = {
    "User-agent": "G2 Http/1.0 (Windows NT 10.0; DX11/1; d3d11/1)",
    Version: "7.14.0",
}

const requestHeadersH1 = {
    "User-agent": "G2 Http/1.0 (Windows NT 10.0; DX11/1; d3d11/1)",
    Version: "6.74.0",
}

type AuthResponse = {
    access_token: string
    refresh_token: string
}

/**
 * Container for official server authentication tokens.
 */
export class OfficialServerAuth {
    /**
     * If this authentication container is ready for use.
     */
    initialized?: boolean
    protected _usableToken?: string
    protected _refreshToken?: string
    protected _gameAuthToken?: string
    private readonly _headers: { "User-agent": string; Version: string }

    /**
     * Kick things off.
     *
     * @param gameVersion The game version.
     * @param gameAuthToken The token for the 3rd party game provider (steam or epic).
     */
    constructor(gameVersion: GameVersion, gameAuthToken: string) {
        this._gameAuthToken = gameAuthToken
        this._headers =
            gameVersion === "h1"
                ? requestHeadersH1
                : gameVersion === "h2"
                ? requestHeadersH2
                : requestHeadersH3
        this.initialized = false
    }

    /**
     * Authenticates the client with the official service the first time.
     *
     * @param req The initial client request.
     */
    async _initiallyAuthenticate(req: Request): Promise<void> {
        try {
            const r = await this._firstTimeObtainData(req)
            this._usableToken = r.access_token
            this._refreshToken = r.refresh_token
            this.initialized = true
        } catch (e) {
            handleAxiosError(e)

            if (PEACOCK_DEV) {
                log(
                    LogLevel.WARN,
                    `Failed to authenticate with official servers for contracts mode: ${e}`,
                )
            }
        }
    }

    /**
     * Makes a request with the required context.
     *
     * @param url The URL to fetch.
     * @param get If the request should be a GET (true), or POST (false).
     * @param body The request's body (defaults to {}).
     * @param headers The request's extra headers (defaults to {}).
     * @returns The response data.
     */
    async _useService<Data = any>(
        url: string,
        get: boolean,
        body = {},
        headers = {},
    ): Promise<AxiosResponse<Data>> {
        if (get) {
            return axios(url, {
                data: body,
                headers: {
                    ...headers,
                    ...this._headers,
                    Authorization: `bearer ${this._usableToken}`,
                },
            })
        }

        return await axios.post(url, body, {
            headers: {
                ...headers,
                ...this._headers,
                Authorization: `bearer ${this._usableToken}`,
            },
        })
    }

    /**
     * Gain a new authentication token.
     */
    async _doRefresh(): Promise<void> {
        if (PEACOCK_DEV) {
            log(
                LogLevel.DEBUG,
                `Using refresh token (${this._refreshToken}) to reauthenticate.`,
            )
        }

        const body = `grant_type=refresh_token&refresh_token=${this._refreshToken}&authcode=${this._gameAuthToken}`

        const res = await axios("https://auth.hitman.io/oauth/token", {
            headers: {
                ...this._headers,
                Authorization: `bearer ${this._usableToken}`,
            },
            data: body,
        })

        const r = res.data as AuthResponse
        this._usableToken = r.access_token
        this._refreshToken = r.refresh_token
        this.initialized = true
    }

    /**
     * Authenticate for the first time.
     *
     * @param req The request from the Hitman client connecting to Peacock.
     * @returns The token data fetched from the official servers.
     */
    private async _firstTimeObtainData(req: Request): Promise<AuthResponse> {
        return (
            await axios.post(
                "https://auth.hitman.io/oauth/token",
                createUrlencodedBody(req.body),
                {
                    headers: this._headers,
                },
            )
        ).data
    }
}

export const userAuths = new Map<string, OfficialServerAuth>()
