/* eslint-disable @typescript-eslint/no-explicit-any */
import type * as core from "express-serve-static-core"
import { RequestWithJwt } from "../../components/types/types"
import { Mock } from "vitest"
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
