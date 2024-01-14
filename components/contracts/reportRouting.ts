/*
 *     The Peacock Project - a HITMAN server replacement.
 *     Copyright (C) 2021-2024 The Peacock Project Team
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
import type { RequestWithJwt } from "../types/types"
const reportRouter = Router()

reportRouter.post(
    "/ReportContract",
    jsonMiddleware(),
    (
        req: RequestWithJwt<never, { contractId: string; reason: number }>,
        res,
    ) => {
        res.json({})
    },
)
export { reportRouter }
