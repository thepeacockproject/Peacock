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

import { writeFile } from "fs/promises"
import pc from "picocolors"
import { Command, Option, runExit } from "clipanion"
import axios from "axios"
import jsonfile from "jsonfile"
import fs from "fs"
import path from "path"
import { randomUUID } from "crypto"
function makeTargetDown(id, codename, parent, sub) {
    return {
        CategoryName: "UI_MENU_PAGE_PROFILE_CHALLENGES_CATEGORY_ELUSIVE",
        Definition: {
            Context: {},
            Scope: "session",
            States: {
                Start: {
                    Kill: {
                        Condition: {
                            $eq: ["$Value.IsTarget", true],
                        },
                        Transition: "Success",
                    },
                },
            },
        },
        Description: `UI_CHALLENGES_ET_${codename.toUpperCase()}_TARGETDOWN_DESC`,
        DifficultyLevels: [],
        Drops: [],
        HideProgression: false,
        Icon: "elusive",
        Id: randomUUID(),
        ImageName: `images/challenges/elusive_target/et_${codename}_targetdown.jpg`,
        InclusionData: {
            ContractIds: [id],
        },
        IsLocked: false,
        IsPlayable: false,
        LocationId: sub,
        Name: `UI_CHALLENGES_ET_${codename.toUpperCase()}_TARGETDOWN_NAME`,
        OrderIndex: 10000,
        ParentLocationId: parent,
        Rewards: {
            MasteryXP: 2000,
        },
        RuntimeType: "Hit",
        Tags: ["story", "medium", "elusive"],
        Type: "contract",
        XpModifier: {},
    }
}

function makeSA(id, codename, parent, sub) {
    return {
        Id: randomUUID(),
        Name: `UI_CHALLENGES_ET_${codename.toUpperCase()}_SILENT_ASSASSIN_NAME`,
        ImageName: `images/challenges/elusive_target/et_${codename}_silentassassin.jpg`,
        Description: `UI_CHALLENGES_ET_${codename.toUpperCase()}_SILENT_ASSASSIN_DESC`,
        Rewards: {
            MasteryXP: 4000,
        },
        Drops: [],
        Definition: {
            Context: {
                Witnesses: [],
                KilledTargets: [],
                RecordingDestroyed: true,
                LastAccidentTime: 0,
            },
            Scope: "session",
            States: {
                Start: {
                    ContractEnd: {
                        Condition: {
                            $and: [
                                {
                                    $eq: [true, "$.RecordingDestroyed"],
                                },
                                {
                                    $all: {
                                        in: "$.Witnesses",
                                        "?": {
                                            $any: {
                                                in: "$.KilledTargets",
                                                "?": {
                                                    $eq: ["$.#", "$.##"],
                                                },
                                            },
                                        },
                                    },
                                },
                            ],
                        },
                        Transition: "Success",
                    },
                    AccidentBodyFound: {
                        $set: ["LastAccidentTime", "$Timestamp"],
                    },
                    Witnesses: {
                        Condition: {
                            $any: {
                                in: "$Value",
                                "?": {
                                    $pushunique: ["Witnesses", "$.#"],
                                },
                            },
                        },
                    },
                    Spotted: {
                        Condition: {
                            $any: {
                                in: "$Value",
                                "?": {
                                    $pushunique: ["Witnesses", "$.#"],
                                },
                            },
                        },
                    },
                    Kill: [
                        {
                            Condition: {
                                $and: [
                                    {
                                        $eq: ["$Value.IsTarget", false],
                                    },
                                    {
                                        $not: {
                                            $eq: ["$Value.KillContext", 1],
                                        },
                                    },
                                ],
                            },
                            Transition: "Failure",
                        },
                        {
                            Condition: {
                                $and: [
                                    {
                                        $eq: ["$Value.IsTarget", false],
                                    },
                                    {
                                        $eq: ["$Value.KillContext", 1],
                                    },
                                ],
                            },
                            Actions: {
                                $pushunique: [
                                    "KilledTargets",
                                    "$Value.RepositoryId",
                                ],
                            },
                        },
                        {
                            Condition: {
                                $eq: ["$Value.IsTarget", true],
                            },
                            Actions: {
                                $pushunique: [
                                    "KilledTargets",
                                    "$Value.RepositoryId",
                                ],
                            },
                        },
                    ],
                    CrowdNPC_Died: {
                        Transition: "Failure",
                    },
                    MurderedBodySeen: [
                        {
                            Condition: {
                                $eq: ["$Value.IsWitnessTarget", true],
                            },
                            Actions: {
                                $pushunique: ["Witnesses", "$Value.Witness"],
                            },
                        },
                        {
                            Condition: {
                                $and: [
                                    {
                                        $eq: ["$Value.IsWitnessTarget", false],
                                    },
                                    {
                                        $not: {
                                            $eq: [
                                                "$.LastAccidentTime",
                                                "$Timestamp",
                                            ],
                                        },
                                    },
                                ],
                            },
                            Transition: "Failure",
                        },
                    ],
                    SecuritySystemRecorder: [
                        {
                            Actions: {
                                $set: ["RecordingDestroyed", false],
                            },
                            Condition: {
                                $eq: ["$Value.event", "spotted"],
                            },
                        },
                        {
                            Actions: {
                                $set: ["RecordingDestroyed", true],
                            },
                            Condition: {
                                $or: [
                                    {
                                        $eq: ["$Value.event", "erased"],
                                    },
                                    {
                                        $eq: ["$Value.event", "destroyed"],
                                    },
                                ],
                            },
                        },
                    ],
                },
            },
        },
        IsPlayable: false,
        IsLocked: false,
        HideProgression: false,
        CategoryName: "UI_MENU_PAGE_PROFILE_CHALLENGES_CATEGORY_ELUSIVE",
        Icon: "elusive",
        LocationId: sub,
        ParentLocationId: parent,
        Type: "contract",
        DifficultyLevels: [],
        OrderIndex: 10000,
        XpModifier: {},
        RuntimeType: "Hit",
        Tags: ["story", "hard", "elusive"],
        InclusionData: {
            ContractIds: [id],
        },
    }
}

const year2Lookup = {
    "b0bed170-8652-4188-8b9a-92caf9f97e5b":
        "507b8b04-8b93-4420-84d1-c0c3a5ce56c3",
    "550c4d75-ca87-4be7-a18e-caf30e6c8136":
        "8043a9b9-8ba6-453d-83f8-aa507c5a1c08",
    "1c0377f3-6e32-4563-8baf-9677cdb3bb60":
        "d036c429-96c1-4305-800c-979cc90cf603",
    "0d938ef9-05c7-4eb8-89cc-ae79b73c6992":
        "81e01a84-7c7f-4967-a4e6-a5450c5cf274",
    "8813e0a4-08ac-494f-a847-687a2da3582f":
        "7ec7dbdb-ea38-4ae1-84a4-82ce5966c198",
    "158b600a-6448-45d3-907f-77351b9656ee":
        "043585fa-455f-481c-aa0a-8d31d063b93a",
    "b555d6a4-8b4d-4e1e-b6bd-ebd135ad1e01":
        "8045afb9-2b97-4c5d-a1c2-cf4d40edf734",
    "263eca3d-d25d-40ce-ba0a-48a221cd0b9e":
        "5f62f7ce-23b6-435b-87ba-aef567ed9d60",
}

const notInH3 = [
    // PARIS
    "13680605-83ed-4b8c-a44d-30cc5b4fb17a",
    "a9d93d2a-c541-49ab-8ba1-9e345cf7e806",
    "16d78245-5392-413c-b3db-989d6685c32a",
    "92a87b10-a230-4986-bb35-06f16e84b11f",
    "5dc115d3-e5d4-4023-a11a-27c6f7194bea",
    "0fea5e55-9aec-41ef-9e5b-4e5e5f536f82",
    // COASTAL TOWN
    "ff188c8b-e1eb-4c59-af75-6b6fe3da5955",
    "0fd17346-bcb4-4bcc-acc3-5e1b6b184ef4",
    "8f13ea71-b207-4955-9eb8-ede757f3baa6",
    "0dc242ce-084e-4f6d-980f-e65885cd6955",
    // MARRAKESH
    "ad549098-eb3d-4132-8ef8-fe77c6afbbaa",
    "c3c7126e-32cd-4502-b5ce-90b5ae436806",
    "3716b654-a42c-45df-9db9-61795a6a3e46",
    // BANGKOK
    "87f8293a-29cd-4cb1-ade7-dd6bb056d38e",
    // MIAMI
    "06a58b66-56f4-45c3-ba1b-d03998212289",
    "ecf353e8-3dd8-4958-b255-f963926aea51",
]

const contractIds = {
    LOCATION_PARENT_PARIS: [
        "8813e0a4-08ac-494f-a847-687a2da3582f",
        "158b600a-6448-45d3-907f-77351b9656ee",
        "2b928d67-c244-4601-bafb-7af664fb17bb",
        "13680605-83ed-4b8c-a44d-30cc5b4fb17a",
        "a9d93d2a-c541-49ab-8ba1-9e345cf7e806",
        "16d78245-5392-413c-b3db-989d6685c32a",
        "92a87b10-a230-4986-bb35-06f16e84b11f",
        "5dc115d3-e5d4-4023-a11a-27c6f7194bea",
        "0fea5e55-9aec-41ef-9e5b-4e5e5f536f82",
    ],
    LOCATION_PARENT_COASTALTOWN: [
        "ff188c8b-e1eb-4c59-af75-6b6fe3da5955",
        "0fd17346-bcb4-4bcc-acc3-5e1b6b184ef4",
        "8f13ea71-b207-4955-9eb8-ede757f3baa6",
        "0dc242ce-084e-4f6d-980f-e65885cd6955",
        "e87217e3-4809-4855-80d5-74bed66be58d",
        "b555d6a4-8b4d-4e1e-b6bd-ebd135ad1e01",
        "8462b2e5-4d34-4300-896f-fe1dc98fa877",
    ],
    LOCATION_PARENT_MARRAKECH: [
        "ad549098-eb3d-4132-8ef8-fe77c6afbbaa",
        "c3c7126e-32cd-4502-b5ce-90b5ae436806",
        "3716b654-a42c-45df-9db9-61795a6a3e46",
        "2e2c3f33-92ad-412f-a351-b7267697ff70",
        "0d938ef9-05c7-4eb8-89cc-ae79b73c6992",
    ],
    LOCATION_PARENT_BANGKOK: [
        "b0bed170-8652-4188-8b9a-92caf9f97e5b",
        "b0b8995c-7b3f-4fa6-91a2-be4bc8edc046",
        "87f8293a-29cd-4cb1-ade7-dd6bb056d38e",
    ],
    LOCATION_PARENT_COLORADO: [
        "550c4d75-ca87-4be7-a18e-caf30e6c8136",
        "655c5a57-69d1-48b6-a14b-2ae396c16174",
    ],
    LOCATION_PARENT_HOKKAIDO: [
        "1c0377f3-6e32-4563-8baf-9677cdb3bb60",
        "deace35f-ab6d-44c9-b1a6-98757e854f74",
    ],
    LOCATION_PARENT_NEWZEALAND: ["44fd7474-d7be-4d3d-b944-6c1cf6ca09d1"],
    LOCATION_PARENT_MIAMI: [
        "06a58b66-56f4-45c3-ba1b-d03998212289",
        "ecf353e8-3dd8-4958-b255-f963926aea51",
    ],
    LOCATION_PARENT_COLOMBIA: ["654685ab-d52d-49cb-815d-f98ee00454d3"],
    LOCATION_PARENT_NORTHAMERICA: ["9f5b8d74-1f70-49ea-94e2-21d2de3e5cf3"],
    LOCATION_PARENT_NORTHSEA: [
        "263eca3d-d25d-40ce-ba0a-48a221cd0b9e",
        "cbc86bed-51ce-4699-89d4-0ded8f200cbc",
    ],
    LOCATION_PARENT_GOLDEN: ["b2c0251e-1803-4e12-b860-b9fa6ce5c004"],
    LOCATION_PARENT_ANCESTRAL: [
        "92951377-419d-4c31-aa21-2a3f03ef82d0",
        "1fcaff1b-7fa3-4b9f-a586-9c7a1689b48d",
    ],
    LOCATION_PARENT_EDGY: ["3f0b8f19-d5d4-4611-ac8f-480f81c18f54"],
    LOCATION_PARENT_WET: ["6fad7901-279f-45df-ab8d-087a3cb06dcc"],
    LOCATION_PARENT_ELEGANT: [
        "d030216e-a8d6-4446-a1f6-2fc1a2461464",
        "9a36cc55-bfc4-4f8b-99d2-c65cf4de365d",
    ],
}
const contractDataPath = "./contractdata"
/**
 * @param {import("axios").AxiosInstance} axiosClient
 * @param {string} contractId
 * @returns {Promise<*>}
 */
async function fetchContractCAndPFromIOI(axiosClient, contractId) {
    if (notInH3.includes(contractId)) {
        return []
    }
    // if the contract id is in the lookup table, use the lookup value instead
    contractId = year2Lookup[contractId] ?? contractId
    console.log(`${pc.blue`Fetching contract`} ${contractId}...`)

    const { data } = await axiosClient.post(
        "/authentication/api/userchannel/ChallengesService/GetActiveChallengesAndProgression",
        {
            contractId,
            difficultyLevel: 2,
        },
    )

    return data
}

/**
 * @param {import("axios").AxiosInstance} axiosClient
 * @param {string} locationId
 * @returns {Promise<*>}
 */
async function fetchContract(axiosClient, contractId) {
    if (notInH3.includes(contractId)) {
        return []
    }
    contractId = year2Lookup[contractId] ?? contractId
    console.log(`Fetching contract planning ${contractId}...`)
    const resp = await axiosClient.get(
        `/profiles/page/Planning?contractid=${contractId}&resetescalation=false&forcecurrentcontract=false`,
        {},
    )

    return resp.data.data.ChallengeData.Children
}

/**
 * @param {string} locationParent
 * @param {string} jwt
 * @param {string} apiUrl
 * @returns {Promise<string>}
 */
async function extract(locationParent, jwt, apiUrl) {
    const httpClient = axios.create({
        baseURL: `https://${apiUrl}/`,
        headers: {
            "User-Agent": "G2 Http/1.0 (Windows NT 10.0; DX12/1; d3d12/1)",
            "Content-Type": "application/json",
            Accept: "application/json, text/*, image/*, application/json",
            Version: "8.12.0",
            Authorization: `bearer ${jwt}`,
        },
    })

    console.log(
        `Fetching destination ${locationParent} from ${pc.underline(
            apiUrl,
        )}...`,
    )

    const missionIds = contractIds[locationParent]

    const planningsData = await Promise.all(
        missionIds.map(async (id) => {
            return await fetchContract(httpClient, id)
        }),
    )

    const missions = await Promise.all(
        missionIds.map(async (id) => {
            return await fetchContractCAndPFromIOI(httpClient, id)
        }),
    )
    let challengeObjects = []

    const group = {
        Name: "UI_MENU_PAGE_PROFILE_CHALLENGES_CATEGORY_ELUSIVE",
        Image: "images/challenges/categories/elusive/tile.jpg",
        Icon: "elusive",
        CategoryId: "elusive",
        Description: "UI_MENU_PAGE_CHALLENGE_CATEGORY_DESCRIPTION_ELUSIVE",
        Challenges: challengeObjects,
    }
    /**
     * @type {SavedChallengeGroup[]}
     */
    const idToRuntimeExtras = {}
    // read runtime files
    for (const singleChallengesProgResult of missions) {
        for (const challenge of singleChallengesProgResult) {
            const {
                Type,
                Definition,
                InclusionData,
                Tags,
                XpModifier,
                Id,
                GroupId,
            } = challenge.Challenge

            idToRuntimeExtras[Id] = {
                XpModifier: XpModifier || {},
                RuntimeType: Type,
                Definition,
                Tags,
                GroupId,
                InclusionData,
            }
        }
    }

    //list of list of challenges
    const ETchals = planningsData.map(
        (single) =>
            single.find((g) => g.CategoryId === "elusive")?.SwitchData.Data
                .Challenges ?? [],
    )

    for (let i = 0; i < ETchals.length; i++) {
        const groupChallenges = ETchals[i]
        if (groupChallenges.length === 0) {
            const contractId = missionIds[i]
            const metadata = await findMetadataByContractId(contractId)
            const codename = metadata.CodeName_Hint.toLowerCase()
            const sub = metadata.Location
            challengeObjects.push(
                makeTargetDown(contractId, codename, locationParent, sub),
            )
            challengeObjects.push(
                makeSA(contractId, codename, locationParent, sub),
            )
        }
        for (let fullPlanningChallenge of groupChallenges) {
            const shortName = fullPlanningChallenge.Name.replace(
                "UI_CHALLENGES_",
                "",
            )

            if (fullPlanningChallenge.Type !== "global") {
                console.log(
                    `  - ${shortName} ${pc.yellow("is not global (skipping)")}`,
                )
                continue
            } else {
                console.log(
                    `  - Adding ${pc.blue(shortName)} to ${pc.magenta(
                        group.CategoryId,
                    )}`,
                )
            }

            fullPlanningChallenge.Drops = fullPlanningChallenge.Drops.map(
                (e) => e.Id,
            )

            fullPlanningChallenge = {
                ...fullPlanningChallenge,
                ...idToRuntimeExtras[fullPlanningChallenge.Id],
            }

            fullPlanningChallenge.InclusionData ??= {}

            const compare = year2Lookup[missionIds[i]] ?? missionIds[i]

            if (fullPlanningChallenge.GroupId === compare) {
                const contractId = missionIds[i]
                if (
                    !(
                        fullPlanningChallenge.InclusionData?.ContractIds || []
                    ).includes(contractId)
                ) {
                    fullPlanningChallenge.InclusionData.ContractIds ??= []
                    fullPlanningChallenge.InclusionData.ContractIds.push(
                        contractId,
                    )
                }
            } else {
                if (
                    !(
                        fullPlanningChallenge.InclusionData?.ContractTypes || []
                    ).includes("elusive")
                ) {
                    fullPlanningChallenge.InclusionData.ContractTypes ??= []
                    fullPlanningChallenge.InclusionData.ContractTypes.push(
                        "elusive",
                    )
                }
            }

            fullPlanningChallenge.CompletionData = undefined
            fullPlanningChallenge.Completed = undefined
            fullPlanningChallenge.ChallengeProgress = undefined
            fullPlanningChallenge.UserCentricContract = undefined

            delete fullPlanningChallenge.GroupId

            challengeObjects.push(fullPlanningChallenge)
        }
    }

    const uniqueObjects = challengeObjects.filter((object, index) => {
        const lastIndex = challengeObjects.findIndex(
            (otherObject, otherIndex) =>
                otherIndex < index && otherObject.Id === object.Id,
        )
        return lastIndex === -1
    })

    challengeObjects = uniqueObjects

    console.log(`Compiled ${pc.green(challengeObjects.length)} challenges`)

    return group
}

class ExtractChallengeDataCommand extends Command {
    outFile = Option.String("--out-file", "result.json")
    jwt = Option.String("--jwt", { required: true })
    locationParent = Option.String("--location-parent", { required: true })
    // https://youtrack.jetbrains.com/issue/WEB-56917
    // noinspection JSCheckFunctionSignatures
    apiUrl = Option.String("--api-url", "hm3-service.hitman.io")

    static usage = Command.Usage({
        category: `Challenges`,
        description: `Extracts challenge data into the Peacock challenge format.`,
        details: ``,
        examples: [
            [
                `Basic usage`,
                `$0 --location-parent LOCATION_PARENT_PARIS --jwt someJsonWebToken`,
            ],
            [
                `With API URL`,
                `$0 --location-parent LOCATION_PARENT_PARIS --jwt someJsonWebToken --api-url pc2-service.hitman.io`,
            ],
        ],
    })

    async execute() {
        if (this.locationParent === "ALL") {
            for (const location in contractIds) {
                const etGroup = await extract(location, this.jwt, this.apiUrl)

                appendGroupToChallenge(location, etGroup)
            }
        } else {
            const data = JSON.stringify(
                {
                    meta: {
                        Location: this.locationParent,
                    },
                    groups: [
                        await extract(
                            this.locationParent,
                            this.jwt,
                            this.apiUrl,
                        ),
                    ],
                },
                undefined,
                4,
            )

            await writeFile(this.outFile, data)
        }
    }
}

// https://youtrack.jetbrains.com/issue/WEB-56917
// noinspection JSCheckFunctionSignatures
await runExit(
    {
        binaryName: "extractChallengeData.mjs",
    },
    ExtractChallengeDataCommand,
)

function findMetadataWithId(metadata, id) {
    if (metadata && metadata.Id === id) {
        return metadata
    }
    for (const key in metadata) {
        const value = metadata[key]
        if (typeof value === "object") {
            const result = findMetadataWithId(value, id)
            if (result) {
                return result
            }
        }
    }
    return null
}

async function findMetadataByContractId(contractId) {
    const files = await fs.promises.readdir(contractDataPath, {
        withFileTypes: true,
    })
    const metadata = {}
    for (const file of files) {
        if (file.isDirectory()) {
            const subfiles = await fs.promises.readdir(
                path.join(contractDataPath, file.name),
                { withFileTypes: true },
            )
            for (const subfile of subfiles) {
                if (subfile.isFile() && subfile.name.endsWith(".json")) {
                    const filepath = path.join(
                        contractDataPath,
                        file.name,
                        subfile.name,
                    )
                    try {
                        const data = await jsonfile.readFile(filepath)
                        const foundMetadata = findMetadataWithId(
                            data.Metadata,
                            contractId,
                        )
                        if (foundMetadata) {
                            return foundMetadata
                        }
                    } catch (error) {
                        console.error(
                            `Error reading file ${filepath}: ${error}`,
                        )
                    }
                }
            }
        }
    }
    return metadata
}

function appendGroupToChallenge(parent, group) {
    const folderPath = "./contractdata"
    const subFolders = fs
        .readdirSync(folderPath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)

    for (const subFolder of subFolders) {
        const filePath = path.join(
            folderPath,
            subFolder,
            `_${subFolder}_CHALLENGES.json`,
        )
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, "utf-8")
            const challenge = JSON.parse(fileContent)
            if (challenge.meta.Location === parent) {
                challenge.groups.push(group)
                fs.writeFileSync(filePath, JSON.stringify(challenge, null, 2))
            }
        }
    }
}
