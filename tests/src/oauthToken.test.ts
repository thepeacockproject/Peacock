/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserProfile } from "../../components/types/types"
import { handleOauthToken } from "../../components/oauthToken"
import { sign, verify } from "jsonwebtoken"
import * as databaseHandler from "../../components/databaseHandler"
import * as platformEntitlements from "../../components/platformEntitlements"
import axios from "axios"

import {
    getMockCallArgument,
    getResolvingPromise,
    mockRequestWithJwt,
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

    it("steam auth hitman 3", async () => {
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
        const accessToken = verify(jsonResponse.access_token, "secret", {
            complete: true,
        })

        expect(jsonResponse.token_type).toBe("bearer")
        expect((accessToken.payload as any).unique_name).toBe(pId)
    })

    test("epic auth hitman 3", async () => {
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
                    "secret",
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
        const accessToken = verify(jsonResponse.access_token, "secret", {
            complete: true,
        })

        expect(jsonResponse.token_type).toBe("bearer")
        expect((accessToken.payload as any).unique_name).toBe(pId)
    })

    it("unsupported auth method", async () => {
        const request = mockRequestWithJwt()
        request.body = {}

        const respose = mockResponse()

        await handleOauthToken(request, respose)

        expect(respose.status).toHaveBeenCalledWith(406)
    })
})
