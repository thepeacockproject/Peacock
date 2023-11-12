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
import { RequestWithJwt } from "../types/types"
import { getConfig } from "../configSwizzleManager"
import { getDefaultSuitFor, uuidRegex } from "../utils"
import { json as jsonMiddleware } from "body-parser"
import { controller } from "../controller"
import {
    generateUserCentric,
    getParentLocationByName,
    getSubLocationByName,
} from "../contracts/dataGen"
import { getUserData } from "../databaseHandler"
import { log, LogLevel } from "../loggingInterop"
import { createInventory, getUnlockableById } from "../inventory"
import { getFlag } from "../flags"
import { loadouts } from "../loadouts"
import { StashpointQueryH2016, StashpointSlotName } from "../types/gameSchemas"

const legacyMenuDataRouter = Router()

legacyMenuDataRouter.get(
    "/stashpoint",
    (req: RequestWithJwt<StashpointQueryH2016>, res) => {
        if (!uuidRegex.test(req.query.contractid)) {
            res.status(400).send("contract id was not a uuid")
            return
        }

        if (typeof req.query.slotname !== "string") {
            res.status(400).send("invalid slot data")
            return
        }

        const contractData = controller.resolveContract(req.query.contractid)

        if (!contractData) {
            res.status(404).send("contract not found")
            return
        }

        const loadoutSlots: StashpointSlotName[] = [
            "carriedweapon",
            "carrieditem",
            "concealedweapon",
            "disguise",
            "gear",
            "gear",
            "stashpoint",
        ]

        if (loadoutSlots.includes(req.query.slotname.slice(0, -1))) {
            req.query.slotid = req.query.slotname.slice(0, -1)
        } else {
            log(
                LogLevel.ERROR,
                `Unknown slotname in legacy stashpoint: ${req.query.slotname}`,
            )
            return
        }

        const userProfile = getUserData(req.jwt.unique_name, req.gameVersion)

        const sublocation = getSubLocationByName(
            contractData.Metadata.Location,
            req.gameVersion,
        )

        const inventory = createInventory(
            req.jwt.unique_name,
            req.gameVersion,
            sublocation,
        )

        const userCentricContract = generateUserCentric(
            contractData,
            req.jwt.unique_name,
            "h1",
        )

        const defaultLoadout = {
            2: "FIREARMS_HERO_PISTOL_TACTICAL_001_SU_SKIN01",
            3: getDefaultSuitFor(sublocation),
            4: "TOKEN_FIBERWIRE",
            5: "PROP_TOOL_COIN",
        }

        const getLoadoutItem = (id: number) => {
            if (getFlag("loadoutSaving") === "LEGACY") {
                const dl = userProfile.Extensions.defaultloadout

                if (!dl) {
                    return defaultLoadout[id]
                }

                const forLocation = (userProfile.Extensions.defaultloadout ||
                    {})[sublocation?.Properties?.ParentLocation]

                if (!forLocation) {
                    return defaultLoadout[id]
                }

                return forLocation[id]
            } else {
                let dl = loadouts.getLoadoutFor("h1")

                if (!dl) {
                    dl = loadouts.createDefault("h1")
                }

                const forLocation =
                    dl.data[sublocation?.Properties?.ParentLocation]

                if (!forLocation) {
                    return defaultLoadout[id]
                }

                return forLocation[id]
            }
        }

        res.json({
            template: getConfig("LegacyStashpointTemplate", false),
            data: {
                ContractId: req.query.contractid,
                // the game actually only needs the loadoutdata from the requested slotid, but this is what IOI servers do
                LoadoutData: [...loadoutSlots.entries()].map(
                    ([slotid, slotname]) => ({
                        SlotName: slotname,
                        SlotId: slotid.toString(),
                        Items: inventory
                            .filter((item) => {
                                return (
                                    item.Unlockable.Properties.LoadoutSlot && // only display items
                                    (item.Unlockable.Properties.LoadoutSlot ===
                                        slotname || // display items for requested slot
                                        (slotname === "stashpoint" && // else: if stashpoint
                                            item.Unlockable.Properties
                                                .LoadoutSlot !== "disguise")) && // => display all non-disguise items
                                    (req.query.allowlargeitems === "true" ||
                                        item.Unlockable.Properties
                                            .LoadoutSlot !== "carriedweapon") &&
                                    item.Unlockable.Type !==
                                        "challengemultipler" &&
                                    !item.Unlockable.Properties.InclusionData
                                ) // not sure about this one
                            })
                            .map((item) => ({
                                Item: item,
                                ItemDetails: {
                                    Capabilities: [],
                                    StatList: item.Unlockable.Properties
                                        .Gameplay
                                        ? Object.entries(
                                              item.Unlockable.Properties
                                                  .Gameplay,
                                          ).map(([key, value]) => ({
                                              Name: key,
                                              Ratio: value,
                                          }))
                                        : [],
                                    PropertyTexts: [],
                                },
                                SlotId: slotid.toString(),
                                SlotName: slotname,
                            })),
                        Page: 0,
                        Recommended: getLoadoutItem(slotid)
                            ? {
                                  item: getUnlockableById(
                                      getLoadoutItem(slotid),
                                      req.gameVersion,
                                  ),
                                  type: loadoutSlots[slotid],
                                  owned: true,
                              }
                            : null,
                        HasMore: false,
                        HasMoreLeft: false,
                        HasMoreRight: false,
                        OptionalData:
                            slotid === 6
                                ? {
                                      stashpoint: req.query.stashpoint,
                                      AllowLargeItems:
                                          req.query.allowlargeitems ||
                                          !req.query.stashpoint,
                                  }
                                : {},
                    }),
                ),
                Contract: userCentricContract.Contract,
                ShowSlotName: req.query.slotname,
                UserCentric: userCentricContract,
            },
        })
    },
)

legacyMenuDataRouter.get("/Safehouse", (req: RequestWithJwt, res, next) => {
    const template = getConfig("LegacySafehouseTemplate", false)

    // call /SafehouseCategory but rewrite the result a bit
    req.url = `/SafehouseCategory?page=0&type=${req.query.type}&subtype=`
    const originalJsonFunc = res.json

    res.json = function json(originalData) {
        return originalJsonFunc.call(this, {
            template,
            data: {
                SafehouseData: originalData.data,
            },
        })
    }

    next()
})

legacyMenuDataRouter.get(
    "/debriefingchallenges",
    jsonMiddleware(),
    (
        req: RequestWithJwt<{ contractSessionId: string; contractId: string }>,
        res,
    ) => {
        if (typeof req.query.contractId !== "string") {
            res.status(400).send("invalid contractId")
            return
        }

        // debriefingchallenges?contractSessionId=00000000000000-00000000-0000-0000-0000-000000000001&contractId=dd906289-7c32-427f-b689-98ae645b407f
        res.json({
            template: getConfig("LegacyDebriefingChallengesTemplate", false),
            data: {
                ChallengeData: {
                    // FIXME: This may not work correctly; I don't know the actual format so I'm assuming challenge tree
                    Children:
                        controller.challengeService.getChallengeTreeForContract(
                            req.query.contractId,
                            req.gameVersion,
                            req.jwt.unique_name,
                        ),
                },
            },
        })
    },
)

legacyMenuDataRouter.get(
    "/MasteryLocation",
    jsonMiddleware(),
    (req: RequestWithJwt<{ locationId: string; difficulty: string }>, res) => {
        const masteryData =
            controller.masteryService.getMasteryDataForDestination(
                req.query.locationId,
                req.gameVersion,
                req.jwt.unique_name,
            )

        const location = getParentLocationByName(
            req.query.locationId,
            req.gameVersion,
        )

        res.json({
            template: getConfig("LegacyMasteryLocationTemplate", false),
            data: {
                DifficultyLevelData: [
                    {
                        Name: "normal",
                        Data: {
                            LocationId: req.query.locationId,
                            ...masteryData[0],
                        },
                        Available: true,
                    },
                    {
                        Name: "pro1",
                        Data: {
                            LocationId: req.query.locationId,
                            ...masteryData[1],
                        },
                        Available: true,
                    },
                ],
                LocationId: req.query.locationId,
                Location: location,
            },
        })
    },
)

export { legacyMenuDataRouter }
