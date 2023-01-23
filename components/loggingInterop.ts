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

import type { NextFunction, Response } from "express"
import type { RequestWithJwt } from "./types/types"
import picocolors from "picocolors"

/**
 * Represents the different log levels.
 */
export enum LogLevel {
    /**
     * For errors. Displays in red.
     */
    ERROR,
    /**
     * For warnings. Displays in yellow.
     */
    WARN,
    /**
     * For information. Displays in blue.
     * This is also the fallback for invalid log level values.
     */
    INFO,
    /**
     * For debugging.
     * Displays in light blue, but only if the `DEBUG` environment variable is set to "*", "yes", "true", or "peacock".
     */
    DEBUG,
    /**
     * For outputting stacktraces.
     */
    TRACE,
}

const isDebug = ["*", "true", "peacock", "yes"].includes(
    process.env.DEBUG || "false",
)

/**
 * Adds leading zeros to a number so that the length of the string will always
 * be the number of places specified.
 *
 * @param num The number.
 * @param places The intended width of the number (character count).
 * @example
 * zeroPad(5, 2) // -> "05"
 */
const zeroPad = (num: string | number, places: number) =>
    String(num).padStart(places, "0")

/**
 * Outputs all given arguments as a debug level indented JSON-message to the console.
 *
 * @param args The values to log.
 */
export function logDebug(...args: unknown[]): void {
    log(LogLevel.DEBUG, JSON.stringify(args, undefined, "    "))
}

/**
 * Outputs a log message to the console.
 *
 * @param level The message's level.
 * @param data The data to output.
 * @see LogLevel
 */
export function log(level: LogLevel, data: string): void {
    const m = data ?? "No message specified"
    const now = new Date()
    const stampParts: number[] = [
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
    ]
    const millis = zeroPad(now.getMilliseconds(), 3)
    const timestamp = `${stampParts
        .map((part) => zeroPad(part, 2))
        .join(":")}:${millis}`

    const header = picocolors.gray(timestamp)
    let outputTransport: (
        message?: unknown,
        ...optionalParams: unknown[]
    ) => void
    let levelString: string

    switch (level) {
        case LogLevel.ERROR:
            outputTransport = console.error
            levelString = picocolors.red("Error")
            break
        case LogLevel.WARN:
            outputTransport = console.warn
            levelString = picocolors.yellow("Warn")
            break
        case LogLevel.INFO:
        default:
            outputTransport = console.log
            levelString = picocolors.blue("Info")
            break
        case LogLevel.DEBUG:
            if (!isDebug) {
                return
            }
            outputTransport = console.log
            levelString = picocolors.blueBright("Debug")
            break
        case LogLevel.TRACE:
            outputTransport = console.trace
            levelString = picocolors.bgYellow("Trace")
            break
    }

    outputTransport(`[${header}] [${levelString}] ${m}`)
}

/**
 * Express middleware that logs all requests and their details with the info log level.
 *
 * @param req The Express request object.
 * @param res The Express response object.
 * @param next The Express next function.
 * @see LogLevel.INFO
 */
export function loggingMiddleware(
    req: RequestWithJwt,
    res: Response,
    next?: NextFunction,
): void {
    log(
        LogLevel.INFO,
        `${picocolors.green(req.method)} ${picocolors.underline(req.url)}`,
    )
    next?.()
}
