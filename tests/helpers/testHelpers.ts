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
import type * as core from "express-serve-static-core"
import { RequestWithJwt } from "../../components/types/types"
import { Mock, vi, expect } from "vitest"
import { sign } from "jsonwebtoken"

export function asMock<T>(value: T): Mock {
    return value as Mock
}

export function mockRequestWithJwt(): RequestWithJwt<core.Query, any> {
    const mockedRequest = <RequestWithJwt<core.Query, any>>{
        headers: {},
        header: (name: string) =>
            mockedRequest.headers[name.toLowerCase()] as string,
    }

    return mockedRequest
}

export function mockRequestWithValidJwt(
    pId: string,
): RequestWithJwt<core.Query, any> {
    const mockedRequest = mockRequestWithJwt()

    const jwtToken = sign(
        {
            unique_name: pId,
        },
        "secret",
    )

    mockedRequest.headers.authorization = `Bearer ${jwtToken}`

    return mockedRequest
}

export function mockResponse(): core.Response {
    const response = {
        status: undefined,
        json: undefined,
        end: undefined,
    }

    const mockImplementation = () => {
        return response
    }

    response.status = vi.fn().mockImplementation(mockImplementation)
    response.json = vi.fn()
    response.end = vi.fn()

    return <core.Response>response
}

export function getResolvingPromise<T>(value?: T): Promise<T> {
    return new Promise((resolve) => {
        resolve(value)
    })
}

export function getMockCallArgument<T>(
    value: any,
    call: number,
    argument: number,
): T {
    const calls = asMock(value).mock.calls

    expect(calls.length).toBeGreaterThanOrEqual(call)
    expect(calls[call].length).toBeGreaterThanOrEqual(argument)

    return asMock(value).mock.calls[call][argument] as T
}
