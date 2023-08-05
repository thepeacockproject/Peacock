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

/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserProfile } from "../../components/types/types"
import { handleOauthToken, JWT_SECRET } from "../../components/oauthToken"
import { sign, verify } from "jsonwebtoken"
import * as databaseHandler from "../../components/databaseHandler"
import * as platformEntitlements from "../../components/platformEntitlements"
import axios from "axios"

import {
    getMockCallArgument,
    getResolvingPromise,
    mockRequestWithJwt,
    mockRequestWithValidJwt,
    mockResponse,
} from "../helpers/testHelpers"

describe("oauthToken", () => {
    const pId = "00000000-0000-0000-0000-000000000047"

    const getExternalUserData = vi
        .spyOn(databaseHandler, "getExternalUserData")
        .mockResolvedValue("")
    const loadUserData = vi
        .spyOn(databaseHandler, "loadUserData")
        .mockResolvedValue(undefined)
    const getUserData = vi
        .spyOn(databaseHandler, "getUserData")
        .mockReturnValue(<UserProfile>{
            Extensions: {},
        })

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("external_steam for hitman 3", async () => {
        vi.spyOn(axios, "post").mockImplementation((url) => {
            if (url === "https://auth.hitman.io/oauth/token") {
                return getResolvingPromise({})
            } else if (
                url ===
                "https://hm3-service.hitman.io/authentication/api/userchannel/ProfileService/GetPlatformEntitlements"
            ) {
                return getResolvingPromise({
                    data: ["mock"],
                })
            }

            return undefined
        })

        const request = mockRequestWithJwt()
        request.body = {
            grant_type: "external_steam",
            steam_userid: "000000000047",
            steam_appid: "1659040",
            pId: pId,
        }

        const response = mockResponse()

        await handleOauthToken(request, response)

        expect(getExternalUserData).toHaveBeenCalledWith(
            "000000000047",
            "steamids",
            "h3",
        )
        expect(loadUserData).toHaveBeenCalledWith(pId, "h3")
        expect(getUserData).toHaveBeenCalledWith(pId, "h3")

        const jsonResponse = getMockCallArgument<any>(response.json, 0, 0)
        const accessToken = verify(jsonResponse.access_token, JWT_SECRET, {
            complete: true,
        })

        expect(jsonResponse.token_type).toBe("bearer")
        expect((accessToken.payload as any).unique_name).toBe(pId)
    })

    it("external_epic for hitman 3", async () => {
        vi.spyOn(platformEntitlements, "getEpicEntitlements").mockResolvedValue(
            ["mock"],
        )

        const request = mockRequestWithJwt()
        request.body = {
            grant_type: "external_epic",
            epic_userid: "0123456789abcdef0123456789abcdef",
            access_token:
                "eg1~" +
                sign(
                    {
                        appid: "fghi4567xQOCheZIin0pazB47qGUvZw4",
                        app: "Hitman 3",
                    },
                    JWT_SECRET,
                ),
            pId: pId,
        }

        const response = mockResponse()

        await handleOauthToken(request, response)

        expect(getExternalUserData).toHaveBeenCalledWith(
            "0123456789abcdef0123456789abcdef",
            "epicids",
            "h3",
        )
        expect(loadUserData).toHaveBeenCalledWith(pId, "h3")
        expect(getUserData).toHaveBeenCalledWith(pId, "h3")

        const jsonResponse = getMockCallArgument<any>(response.json, 0, 0)
        const accessToken = verify(jsonResponse.access_token, JWT_SECRET, {
            complete: true,
        })

        expect(jsonResponse.token_type).toBe("bearer")
        expect((accessToken.payload as any).unique_name).toBe(pId)
    })

    it("refresh_token - missing auth header", async () => {
        const request = mockRequestWithJwt()

        request.body = {
            grant_type: "refresh_token",
        }

        const respose = mockResponse()

        let error: Error = undefined

        try {
            await handleOauthToken(request, respose)
        } catch (e) {
            error = e
        }

        expect(error).toBeInstanceOf(TypeError)
    })

    it("refresh_token - invalid auth header", async () => {
        const request = mockRequestWithJwt()
        request.headers.authorization = "Bearer invalid"

        request.body = {
            grant_type: "refresh_token",
        }

        const respose = mockResponse()

        let error: Error = undefined

        try {
            await handleOauthToken(request, respose)
        } catch (e) {
            error = e
        }

        expect(error).toBeInstanceOf(TypeError)
    })

    it("refresh_token - valid auth header", async () => {
        const request = mockRequestWithValidJwt(pId)

        // NOTE: We don't care about the actual values
        request.body = {
            grant_type: "refresh_token",
        }

        const response = mockResponse()

        await handleOauthToken(request, response)

        const jsonResponse = getMockCallArgument<any>(response.json, 0, 0)
        const accessToken = verify(jsonResponse.access_token, JWT_SECRET, {
            complete: true,
        })

        expect(jsonResponse.token_type).toBe("bearer")
        expect((accessToken.payload as any).unique_name).toBe(pId)
    })

    it("no grant_type", async () => {
        const request = mockRequestWithJwt()
        request.body = {}

        const respose = mockResponse()

        await handleOauthToken(request, respose)

        expect(respose.status).toHaveBeenCalledWith(406)
    })
})
