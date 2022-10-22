/*
 *     The Peacock Project - a HITMAN server replacement.
 *     Copyright (C) 2021-2022 The Peacock Project Team
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

import type { RequestWithJwt } from "../types/types"
import type { Response } from "express"
import parseUrl from "parseurl"
import axios from "axios"
import { log, LogLevel } from "../loggingInterop"
import { getFlag } from "../flags"
import { createWriteStream } from "fs"

const fileNameSafeChars: readonly string[] =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_".split("")

export async function imageFetchingMiddleware(
    req: RequestWithJwt,
    res: Response,
): Promise<void> {
    if (getFlag("imageLoading") === "OFFLINE") {
        res.status(404).send("Image not offline, unable to provide.")
        return
    }

    const originalUrl = parseUrl.original(req)
    const path = parseUrl(req)?.pathname

    if (!path) {
        return
    }

    // make sure redirect occurs at mount
    if (path === "/" && originalUrl?.pathname?.slice(-1) !== "/") {
        res.status(404).send("Not found!")
        return
    }

    // if the path has more than one period, or any of the characters are not in fileNameSafeChars, then we reject it
    if (
        path.split(".").length > 2 ||
        path.split("").some((char) => !fileNameSafeChars.includes(char))
    ) {
        log(LogLevel.WARN, `Invalid image path: ${path}`)
        res.status(400).send("Arbitrary file access is not allowed.")
        return
    }

    try {
        const axiosResponse = await axios(
            `https://img.rdil.rocks/images${path}`,
            {
                responseType: "stream",
            },
        )

        if (path.endsWith(".jpg")) {
            res.header("Content-Type", "image/jpg")
        } else if (path.endsWith(".png")) {
            res.header("Content-Type", "image/png")
        }

        axiosResponse.data.pipe(res)

        if (getFlag("imageLoading") === "SAVEASREQUESTED") {
            log(LogLevel.DEBUG, `Saving image ${path} to disk.`)

            // we got the image, we should be fine
            // may need to introduce extra security here in the future, not sure though
            // we've got bidi and escape paths taken care of, so it should be enough, I hope?
            const writeStream = createWriteStream(`images${path}`)

            writeStream.on("finish", () => {
                log(LogLevel.INFO, `Saved image ${path} to disk.`)

                writeStream.close()
            })

            writeStream.on("error", (err) => {
                log(
                    LogLevel.ERROR,
                    `Failed to save image ${path} to disk: ${err}`,
                )

                writeStream.close()
            })

            axiosResponse.data.pipe(writeStream)
        }
    } catch (e) {
        log(LogLevel.DEBUG, `[Image loading] Err ${e} ${e.stack}`)

        res.status(500).send("Failed to get data")
    }
}
