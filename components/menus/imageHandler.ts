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

const dangerousBidiChars = [
    "\u061C",
    "\u200E",
    "\u200F",
    "\u202A",
    "\u202B",
    "\u202C",
    "\u202D",
    "\u202E",
    "\u2066",
    "\u2067",
    "\u2068",
    "\u2069",
]

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

    if (path.includes("./")) {
        res.status(400).send("Hey, you can't write/read arbitrary files!!")
        return
    }

    for (const char of dangerousBidiChars) {
        if (path.includes(char)) {
            res.status(400).send(
                "Hey, you can't put malicious bidi characters in the URL!!",
            )
            return
        }
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

        if (getFlag("imageLoading") === "SAVEONREQUESTED") {
            // we got the image, we should be fine
            // may need to introduce extra security here in the future, not sure though
            // we've got bidi and escape paths taken care of, so it should be enough, I hope?
            axiosResponse.data.pipe(createWriteStream(`images${path}`))
        }
    } catch (e) {
        log(LogLevel.DEBUG, `Err ${e} ${e.stack}`)
        res.status(500).send("failed to get data")
    }
}
