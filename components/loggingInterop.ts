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
import winston from "winston"
import "winston-daily-rotate-file"

/**
 * Represents the different log levels.
 */
export enum LogLevel {
    /**
     * For errors. Displays in red.
     */
    ERROR = "error",
    /**
     * For warnings. Displays in yellow.
     */
    WARN = "warn",
    /**
     * For information. Displays in blue.
     * This is also the fallback for invalid log level values.
     */
    INFO = "info",
    /**
     * For debugging.
     * Displays in light blue, but only if the `DEBUG` environment variable is set to "*", "yes", "true", or "peacock".
     */
    DEBUG = "debug",
    /**
     * For outputting stacktraces.
     */
    TRACE = "trace",
}

const isDebug = ["*", "true", "peacock", "yes"].includes(
    process.env.DEBUG || "false",
)

const isTest = ["*", "true", "peacock", "yes"].includes(
    process.env.TEST || "false",
)

const transports = []

if (!isTest) {
    const fileTransport = new winston.transports.DailyRotateFile({
        filename: "logs/peacock-%DATE%.json",
        datePattern: "YYYYMMDDHHmmss",
        frequency: "1d",
        maxFiles: process.env.LOG_MAX_FILES,
        level: LogLevel.TRACE,
        format: winston.format.printf((info) => {
            return JSON.stringify(info.data)
        }),
    })

    transports.push(fileTransport)
}

const consoleTransport = new winston.transports.Console({
    format: winston.format.printf((info) => {
        if (info.data.stack) {
            return `${info.message}\n${info.data.stack}`
        }

        return info.message
    }),
})

transports.push(consoleTransport)

const winstonLogLevel = {}
Object.values(LogLevel).forEach((e, i) => (winstonLogLevel[e] = i))

const logger = winston.createLogger({
    levels: winstonLogLevel,
    level: isDebug || isTest ? LogLevel.TRACE : LogLevel.INFO,
    transports: transports,
})

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
    const message = data ?? "No message specified"

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

    const timestampColored = picocolors.gray(timestamp)

    let levelString: string
    let levelStringColored: string
    let stack = undefined

    switch (level) {
        case LogLevel.ERROR:
            levelString = "Error"
            levelStringColored = picocolors.red(levelString)
            break
        case LogLevel.WARN:
            levelString = "Warn"
            levelStringColored = picocolors.yellow(levelString)
            break
        case LogLevel.INFO:
        default:
            levelString = "Info"
            levelStringColored = picocolors.blue(levelString)
            break
        case LogLevel.DEBUG:
            levelString = "Debug"
            levelStringColored = picocolors.blueBright(levelString)
            break
        case LogLevel.TRACE:
            levelString = "Trace"
            levelStringColored = picocolors.bgYellow(levelString)
            stack = new Error("Trace").stack
            break
    }

    logger.log(
        level,
        `[${timestampColored}] [${levelStringColored}] ${message}`,
        {
            data: {
                timestamp: timestamp,
                level: levelString,
                message: message,
                stack: stack,
            },
        },
    )
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
