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

import type { RequestWithJwt } from "../types/types"
import type { Response } from "express"
import parseUrl from "parseurl"
import axios from "axios"
import { log, LogLevel } from "../loggingInterop"
import { getFlag } from "../flags"
import { Filename, JailFS, NodeFS, ppath } from "@yarnpkg/fslib"
import * as fs from "fs"

const imageJailFs = new JailFS(ppath.join(ppath.cwd(), "images" as Filename), {
    baseFs: new NodeFS(fs),
})

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

            const dir = ppath.dirname(path as Filename)

            if (!imageJailFs.existsSync(dir)) {
                log(LogLevel.DEBUG, `Creating missing directory ${dir}`)

                imageJailFs.mkdirSync(dir, { recursive: true })
            }

            const writeStream = imageJailFs.createWriteStream(
                ppath.resolve(path as Filename),
            )

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
        log(
            LogLevel.DEBUG,
            `[Image loading] Err ${e} ${(e as Error | undefined)?.stack}`,
        )

        res.status(500).send("Failed to get data")
    }
}
