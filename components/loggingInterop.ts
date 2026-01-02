/*
 *     The Peacock Project - a HITMAN server replacement.
 *     Copyright (C) 2021-2026 The Peacock Project Team
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

import type { NextFunction, Request, Response } from "express"
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
     * For debugging. Displays in light blue.
     */
    DEBUG = "debug",
    /**
     * For outputting stack traces.
     */
    TRACE = "trace",
    /**
     * For extremely verbose purposes.
     */
    SILLY = "silly",
}

/**
 * Represents the different internal log categories used by Peacock.
 * @internal
 */
export const enum LogCategory {
    /**
     * Remove the category from the log
     */
    NONE = "none",
    /**
     * Used for logging HTTP request
     */
    HTTP = "http",
}

const LOG_LEVEL_NONE = "none"

const LOG_CATEGORY_DEFAULT = LogCategory.NONE

const fileLogLevel = process.env.LOG_LEVEL_FILE || LogLevel.SILLY
const consoleLogLevel = process.env.LOG_LEVEL_CONSOLE || LogLevel.SILLY
const disabledLogCategories =
    process.env.LOG_CATEGORY_DISABLED?.split(",") || []

const transports = []

if (fileLogLevel !== LOG_LEVEL_NONE) {
    const fileTransport = new winston.transports.DailyRotateFile({
        filename: "logs/peacock-%DATE%.json",
        datePattern: "YYYYMMDDHHmmss",
        frequency: "1d",
        maxFiles: process.env.LOG_MAX_FILES,
        level: fileLogLevel,
        format: winston.format.printf((info) => {
            return JSON.stringify(info.data)
        }),
    })

    transports.push(fileTransport)
}

if (consoleLogLevel !== LOG_LEVEL_NONE) {
    const consoleTransport = new winston.transports.Console({
        level: consoleLogLevel,
        format: winston.format.combine(
            winston.format((info) => {
                if (
                    // @ts-expect-error todo fix types
                    !info.data.category ||
                    // @ts-expect-error todo fix types
                    !disabledLogCategories.includes(info.data.category)
                ) {
                    return info
                }

                return false
            })(),
            winston.format.printf((info) => {
                // @ts-expect-error todo fix types
                if (info.data.stack) {
                    // @ts-expect-error todo fix types
                    return `${info.message}\n${info.data.stack}`
                }

                return info.message as string
            }),
        ),
    })

    transports.push(consoleTransport)
}

const winstonLogLevel = {}
// @ts-expect-error Type mismatch.
Object.values(LogLevel).forEach((e, i) => (winstonLogLevel[e] = i))

const logger = winston.createLogger({
    levels: winstonLogLevel,
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

function fixMessage(message: string | unknown | null | undefined): string {
    switch (typeof message) {
        case "string":
            return message
        case "object":
            return JSON.stringify(message, undefined, 4)
        case "undefined":
            return "undefined"
        case "function":
            return "function"
        default:
            return String(message)
    }
}

/**
 * Outputs a log message to the console.
 *
 * @param level The message's level.
 * @param data The data to output.
 * @param category The message's category.
 * @see LogLevel
 *
 * @function log
 */
export function log(
    level: LogLevel,
    data: string | unknown,
    category: LogCategory | string = LOG_CATEGORY_DEFAULT,
): void {
    const message = fixMessage(data)

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
    const categoryColored = picocolors.gray(category)

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
        case LogLevel.SILLY:
            levelString = "Silly"
            levelStringColored = picocolors.bgMagenta(levelString)
            break
    }

    const categoryAndLevel =
        category === LogCategory.NONE
            ? levelStringColored
            : `${levelStringColored} | ${categoryColored}`

    logger.log(
        level,
        `[${timestampColored}] [${categoryAndLevel}] ${message}`,
        {
            data: {
                timestamp: timestamp,
                category: category,
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
 * @param _ The Express response object.
 * @param next The Express next function.
 * @see LogLevel.INFO
 */
export function loggingMiddleware(
    req: Request,
    _: Response,
    next?: NextFunction,
): void {
    log(
        LogLevel.INFO,
        `${picocolors.green(req.method)} ${picocolors.underline(req.url)}`,
        LogCategory.HTTP,
    )
    next?.()
}

export function requestLoggingMiddleware(
    req: Request,
    res: Response,
    next?: NextFunction,
): void {
    res.once("finish", () => {
        const debug = {
            method: req.method,
            url: req.url,
            body: req.body,
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
        }

        log(LogLevel.DEBUG, JSON.stringify(debug), LogCategory.HTTP)
    })

    next?.()
}

export function errorLoggingMiddleware(
    err: Error,
    req: Request,
    _: Response,
    next?: NextFunction,
): void {
    const debug = {
        method: req.method,
        url: req.url,
        body: req.body,
        error: `${err.name} - ${err.message} - ${
            err.cause || "Unknown cause"
        }\n${err.stack || "No stack"}`,
    }

    log(
        LogLevel.ERROR,
        `${picocolors.green(req.method)} ${picocolors.underline(
            req.url,
        )} gave an unexpected error! Please see log for details.`,
        LogCategory.HTTP,
    )

    log(LogLevel.DEBUG, JSON.stringify(debug), LogCategory.HTTP)

    next?.()
}
