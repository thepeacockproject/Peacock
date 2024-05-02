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

import type { MissionManifestObjective, RepositoryId } from "../types/types"
import { randomUUID } from "crypto"
import assert from "assert"

/**
 * The payload provided to the game for each target in the create menu route.
 */
export type ContractCreationNpcTargetPayload = {
    RepositoryId: string
    Selected: boolean
    Weapon: {
        RepositoryId: string
        KillMethodBroad: string
        KillMethodStrict: string
        RequiredKillMethod: string
        RequiredKillMethodType: number
    }
    Outfit: {
        RepositoryId: string
        Required: boolean
        IsHitmanSuit: boolean
    }
}

/**
 * @internal
 */
export const createTargetKillObjective = (
    params: ContractCreationNpcTargetPayload,
): MissionManifestObjective => ({
    Type: "statemachine",
    Id: randomUUID(),
    BriefingText: {
        $loc: {
            key: "UI_CONTRACT_GENERAL_OBJ_KILL",
            data: `$($repository ${params.RepositoryId}).Name`,
        },
    },
    HUDTemplate: {
        display: {
            $loc: {
                key: "UI_CONTRACT_GENERAL_OBJ_KILL",
                data: `$($repository ${params.RepositoryId}).Name`,
            },
        },
    },
    Category: "primary",
    Definition: {
        Scope: "Hit",
        Context: {
            Targets: [params.RepositoryId],
        },
        States: {
            Start: {
                Kill: {
                    Condition: {
                        $eq: ["$Value.RepositoryId", params.RepositoryId],
                    },
                    Transition: "Success",
                },
            },
        },
    },
})

/**
 * @internal
 */
export const createRequiredOutfitObjective = (
    params: ContractCreationNpcTargetPayload,
): MissionManifestObjective => ({
    Type: "statemachine",
    Id: randomUUID(),
    Category: "secondary",
    Definition: {
        Scope: "Hit",
        Context: {
            Targets: [params.RepositoryId],
        },
        States: {
            Start: {
                Kill: [
                    {
                        Condition: {
                            $and: [
                                {
                                    $eq: [
                                        "$Value.RepositoryId",
                                        params.RepositoryId,
                                    ],
                                },
                                params.Outfit.IsHitmanSuit
                                    ? {
                                          $eq: [
                                              "$Value.OutfitIsHitmanSuit",
                                              true,
                                          ],
                                      }
                                    : {
                                          $eq: [
                                              "$Value.OutfitRepositoryId",
                                              params.Outfit.RepositoryId,
                                          ],
                                      },
                            ],
                        },
                        Transition: "Success",
                    },
                    // state machines fall through to the next state if the condition is not met
                    {
                        Condition: {
                            $eq: ["$Value.RepositoryId", params.RepositoryId],
                        },
                        Transition: "Failure",
                    },
                ],
            },
        },
    },
    TargetConditions: [],
})

/**
 * Create the target, weapon, and kill conditions for a contracts target.
 * @param params The parameters from the request.
 * @param customIds Custom objective IDs for testing purposes.
 */
export function createObjectivesForTarget(
    params: ContractCreationNpcTargetPayload,
    customIds?: { base: string; kill: string; outfit: string },
): MissionManifestObjective[] {
    const targetSm = createTargetKillObjective(params)

    if (customIds?.base) {
        targetSm.Id = customIds.base
    }

    const objectives: MissionManifestObjective[] = [targetSm]

    // if the required field is true, that means the user requested something OTHER than any disguise
    if (params.Outfit.Required) {
        const outfitSm = createRequiredOutfitObjective(params)

        if (customIds?.outfit) {
            outfitSm.Id = customIds.outfit
        }

        targetSm.TargetConditions ??= []

        targetSm.TargetConditions.push({
            Type: params.Outfit.IsHitmanSuit ? "hitmansuit" : "disguise",
            RepositoryId: params.Outfit.RepositoryId,
            // for contract creation it's always optional, only escalations set hard fail conditions
            HardCondition: false,
            ObjectiveId: outfitSm.Id,
            // "Amazing!" - Athena Savalas
            KillMethod: "",
        })

        objectives.push(outfitSm)
    }

    if (params.Weapon.RequiredKillMethodType !== 0) {
        const weaponSm = createWeaponObjective(
            params.Weapon,
            params.RepositoryId,
        )

        if (customIds?.kill) {
            weaponSm.Id = customIds.kill
        }

        targetSm.TargetConditions ??= []

        targetSm.TargetConditions.push({
            Type: "killmethod",
            RepositoryId: params.Weapon.RepositoryId,
            // for contract creation it's always optional, only escalations set hard fail conditions
            HardCondition: false,
            ObjectiveId: weaponSm.Id,
            KillMethod: params.Weapon.RequiredKillMethod,
        })

        objectives.push(weaponSm)
    }

    return objectives
}

/**
 * Create an objective for killing a target with a specific weapon.
 * @param weapon The weapon details from the request.
 * @param npcId The target NPC's repository ID.
 */
function createWeaponObjective(
    weapon: Weapon,
    npcId: RepositoryId,
): MissionManifestObjective {
    return {
        Type: "statemachine",
        Id: randomUUID(),
        Category: "secondary",
        Definition: {
            Scope: "Hit",
            Context: {
                Targets: [npcId],
            },
            States: {
                Start: {
                    Kill: [
                        {
                            Condition: {
                                $and: [
                                    {
                                        $eq: ["$Value.RepositoryId", npcId],
                                    },
                                    genStateMachineKillSuccessCondition(weapon),
                                ],
                            },
                            Transition: "Success",
                        },
                        {
                            Condition: {
                                $eq: ["$Value.RepositoryId", npcId],
                            },
                            Transition: "Failure",
                        },
                    ],
                },
            },
        },
    }
}

/**
 * Create a time limit objective.
 * @param time The amount of time to use in seconds.
 * @param optional If the objective should be optional or not.
 * @returns The generated state machine.
 */
export function createTimeLimit(
    time: number,
    optional: boolean,
): MissionManifestObjective {
    const descLocString = optional
        ? "UI_CONTRACT_UGC_TIME_LIMIT_SECONDARY_DESC"
        : "UI_CONTRACT_UGC_TIME_LIMIT_PRIMARY_DESC"
    const timeLimit = Math.floor(time)
    const timeSeconds = timeLimit % 60
    const timeMinutes = Math.trunc(timeLimit / 60) % 60
    const timeHours = Math.trunc(timeLimit / 3600)
    const timeLimitStr = `${
        timeHours ? `${timeHours}:` : ""
    }${`0${timeMinutes}`.slice(-2)}:${`0${timeSeconds}`.slice(-2)}`

    return {
        Type: "statemachine",
        Id: "1a596216-381e-4592-9798-26f156973942",
        ObjectiveType: "custom",
        Category: optional ? "secondary" : "primary",
        BriefingName: "$loc UI_CONTRACT_UGC_TIME_LIMIT_NAME",
        BriefingText: {
            $loc: {
                key: descLocString,
                data: `$formatstring ${timeLimitStr}`,
            },
        },
        LongBriefingText: {
            $loc: {
                key: descLocString,
                data: `$formatstring ${timeLimitStr}`,
            },
        },
        HUDTemplate: {
            display: {
                $loc: {
                    key: descLocString,
                    data: `$formatstring ${timeLimitStr}`,
                },
            },
        },
        Image: "images/contractconditions/condition_contrac_time_limit.jpg",
        OnActive: {
            IfInProgress: {
                State: "Completed",
            },
        },
        CombinedDisplayInHud: true,
        Definition: {
            Scope: "session",
            States: {
                Start: {
                    IntroCutEnd: {
                        Transition: "TimerRunning",
                    },
                },
                TimerRunning: {
                    exit_gate: {
                        Transition: "Success",
                    },
                    $timer: [
                        {
                            Condition: {
                                $after: timeLimit,
                            },
                            Transition: "Failure",
                        },
                    ],
                },
            },
        },
    }
}

/**
 * These are all the possible ways to get a kill in contracts mode.
 */
export const enum ContractKillMethod {
    Any,
    AnyMelee,
    ObjectMelee,
    AnyThrown,
    ObjectThrown,
    Pistol,
    PistolElimination,
    Smg,
    AssaultRifle,
    Shotgun,
    SniperRifle,
    AnyPoison,
    ConsumedPoison,
    InjectedPoison,
    AnyAccident,
    ExplosiveDevice,
    FiberWire,
    UnarmedNeckSnap,
}

type Weapon = ContractCreationNpcTargetPayload["Weapon"]
type KillSuccessStateCondition = unknown

export function genStateMachineKillSuccessCondition(
    weapon: Weapon,
): KillSuccessStateCondition {
    const km = weaponToKillMethod(weapon)

    if (km === ContractKillMethod.PistolElimination) {
        return {
            $any: {
                "?": {
                    $or: [
                        {
                            $eq: ["$.#", "pistol"],
                        },
                        {
                            $eq: ["$.#", "close_combat_pistol_elimination"],
                        },
                    ],
                },
                in: ["$Value.KillMethodBroad", "$Value.KillMethodStrict"],
            },
        }
    }

    if (km === ContractKillMethod.Pistol) {
        return {
            $any: {
                "?": {
                    $or: [
                        {
                            $eq: ["$.#", "pistol"],
                        },
                        {
                            $eq: ["$.#", "close_combat_pistol_elimination"],
                        },
                    ],
                },
                in: ["$Value.KillMethodBroad", "$Value.KillMethodStrict"],
            },
        }
    }

    return {
        $any: {
            "?": {
                $eq: ["$.#", weapon.RequiredKillMethod],
            },
            in: ["$Value.KillMethodBroad", "$Value.KillMethodStrict"],
        },
    }
}

/**
 * Get the equivalent kill method from a weapon object.
 * @param weapon The weapon's details.
 */
export function weaponToKillMethod(weapon: Weapon): ContractKillMethod {
    const type = weapon.RequiredKillMethodType

    if (type === 0) {
        return ContractKillMethod.Any
    }

    switch (weapon.KillMethodBroad) {
        case "pistol":
            return ContractKillMethod.Pistol
        case "smg":
            return ContractKillMethod.Smg
        case "sniperrifle":
            return ContractKillMethod.SniperRifle
        case "assaultrifle":
            return ContractKillMethod.AssaultRifle
        case "shotgun":
            return ContractKillMethod.Shotgun
        case "close_combat_pistol_elimination":
            return ContractKillMethod.PistolElimination
        case "fiberwire":
            return ContractKillMethod.FiberWire
        case "throw": {
            return type === 1
                ? ContractKillMethod.AnyThrown
                : ContractKillMethod.ObjectThrown
        }
        case "melee_lethal": {
            return type === 1
                ? ContractKillMethod.AnyMelee
                : ContractKillMethod.ObjectMelee
        }
        case "poison": {
            if (weapon.KillMethodStrict === "consumed_poison" && type === 2) {
                return ContractKillMethod.ConsumedPoison
            }

            if (
                weapon.KillMethodStrict === "injected_poison" &&
                weapon.RequiredKillMethodType === 2
            ) {
                return ContractKillMethod.InjectedPoison
            }

            assert(
                type === 1,
                `Unhandled poison: ${weapon.KillMethodStrict} ${type}`,
            )

            return ContractKillMethod.AnyPoison
        }
        case "unarmed":
            return ContractKillMethod.UnarmedNeckSnap
        case "accident":
            return ContractKillMethod.AnyAccident
        case "explosive":
            return ContractKillMethod.ExplosiveDevice
        default: {
            assert.fail(
                `Unhandled condition: ${weapon.KillMethodBroad} ${type}`,
            )
        }
    }
}
