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

import { Router } from "express"
import { json as jsonMiddleware } from "body-parser"

const legacyEventRouter = Router()

legacyEventRouter.post(
    "/SaveAndSynchronizeEvents3",
    jsonMiddleware({ limit: "10Mb" }),
    (req, res, next) => {
        // call /SaveAndSynchronizeEvents4 but add/remove dummy pushMessages
        req.url = "/SaveAndSynchronizeEvents4"
        req.body.lastPushDt = "0"

        const originalJsonFunc = res.json

        res.json = function (originalData) {
            delete originalData.PushMessages
            return originalJsonFunc.call(this, originalData)
        }

        next()
    },
)

export { legacyEventRouter }
