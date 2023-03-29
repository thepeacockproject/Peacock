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

/**
 * @param {import("axios").AxiosInstance} axiosClient
 * @param {string} contractId
 * @returns {Promise<*>}
 */
async function fetchContractCAndPFromIOI(axiosClient, contractId) {
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

const contractIds = {
    LOCATION_PARENT_PARIS: [
        "8813e0a4-08ac-494f-a847-687a2da3582f",
        "13680605-83ed-4b8c-a44d-30cc5b4fb17a",
        "158b600a-6448-45d3-907f-77351b9656ee",
        "2b928d67-c244-4601-bafb-7af664fb17bb",
        "a9d93d2a-c541-49ab-8ba1-9e345cf7e806",
        "16d78245-5392-413c-b3db-989d6685c32a",
        "92a87b10-a230-4986-bb35-06f16e84b11f",
        "5dc115d3-e5d4-4023-a11a-27c6f7194bea",
        "0fea5e55-9aec-41ef-9e5b-4e5e5f536f82",
    ],
    LOCATION_PARENT_COASTALTOWN: [
        "ff188c8b-e1eb-4c59-af75-6b6fe3da5955",
        "0fd17346-bcb4-4bcc-acc3-5e1b6b184ef4",
        "e87217e3-4809-4855-80d5-74bed66be58d",
        "8f13ea71-b207-4955-9eb8-ede757f3baa6",
        "0dc242ce-084e-4f6d-980f-e65885cd6955",
        "b555d6a4-8b4d-4e1e-b6bd-ebd135ad1e01",
        "8462b2e5-4d34-4300-896f-fe1dc98fa877",
    ],
    LOCATION_PARENT_MARRAKECH: [
        "0d938ef9-05c7-4eb8-89cc-ae79b73c6992",
        "ad549098-eb3d-4132-8ef8-fe77c6afbbaa",
        "c3c7126e-32cd-4502-b5ce-90b5ae436806",
        "2e2c3f33-92ad-412f-a351-b7267697ff70",
        "3716b654-a42c-45df-9db9-61795a6a3e46",
    ],
    LOCATION_PARENT_BANGKOK: [
        "b0bed170-8652-4188-8b9a-92caf9f97e5b",
        // "b0b8995c-7b3f-4fa6-91a2-be4bc8edc046",
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
    // LOCATION_PARENT_NEWZEALAND: ["44fd7474-d7be-4d3d-b944-6c1cf6ca09d1"],
    LOCATION_PARENT_MIAMI: [
        "06a58b66-56f4-45c3-ba1b-d03998212289",
        "ecf353e8-3dd8-4958-b255-f963926aea51",
    ],
    LOCATION_PARENT_COLOMBIA: ["01e38e22-b8d8-4266-af3b-f3330c41e6f2"],
    LOCATION_PARENT_NORTHAMERICA: ["332e588b-80a3-4cb0-abc6-dc8de3d89e83"],
    LOCATION_PARENT_NORTHSEA: [
        "263eca3d-d25d-40ce-ba0a-48a221cd0b9e",
        "cbc86bed-51ce-4699-89d4-0ded8f200cbc",
    ],
    // LOCATION_PARENT_GOLDEN: ["b2c0251e-1803-4e12-b860-b9fa6ce5c004"],
    // LOCATION_PARENT_ANCESTRAL: [
    //     "92951377-419d-4c31-aa21-2a3f03ef82d0",
    //     "1fcaff1b-7fa3-4b9f-a586-9c7a1689b48d",
    // ],
    // LOCATION_PARENT_EDGY: ["3f0b8f19-d5d4-4611-ac8f-480f81c18f54"],
    // LOCATION_PARENT_WET: ["6fad7901-279f-45df-ab8d-087a3cb06dcc"],
    // LOCATION_PARENT_ELEGANT: [
    //     "d030216e-a8d6-4446-a1f6-2fc1a2461464",
    //     "9a36cc55-bfc4-4f8b-99d2-c65cf4de365d",
    // ],
    YEAR1: [
        "655c5a57-69d1-48b6-a14b-2ae396c16174",
        "deace35f-ab6d-44c9-b1a6-98757e854f74",
        // "6fad7901-279f-45df-ab8d-087a3cb06dcc",
        // "1fcaff1b-7fa3-4b9f-a586-9c7a1689b48d",
        // "9a36cc55-bfc4-4f8b-99d2-c65cf4de365d",
        // "3f0b8f19-d5d4-4611-ac8f-480f81c18f54",
        // "d030216e-a8d6-4446-a1f6-2fc1a2461464",
        // "92951377-419d-4c31-aa21-2a3f03ef82d0",
        // "b2c0251e-1803-4e12-b860-b9fa6ce5c004",
        // "b0b8995c-7b3f-4fa6-91a2-be4bc8edc046",
        "2e2c3f33-92ad-412f-a351-b7267697ff70",
        "e87217e3-4809-4855-80d5-74bed66be58d",
        "2b928d67-c244-4601-bafb-7af664fb17bb",
        // "44fd7474-d7be-4d3d-b944-6c1cf6ca09d1",
        "cbc86bed-51ce-4699-89d4-0ded8f200cbc",
        "8462b2e5-4d34-4300-896f-fe1dc98fa877",
    ],
}

/**
 * @param {import("axios").AxiosInstance} axiosClient
 * @param {string} locationId
 * @returns {Promise<*>}
 */
async function fetchContract(axiosClient, contractId) {
    console.log(`Fetching contract planning ${contractId}...`)
    const resp = await axiosClient.get(
        `/profiles/page/Planning?contractid=${contractId}&resetescalation=false&forcecurrentcontract=false&errorhandling=false`,
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
            Version: "8.9.0",
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
    const challengeObjects = []

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
    const groups = [group]
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
            single.find((g) => g.CategoryId === "elusive").SwitchData.Data
                .Challenges,
    )

    for (let i = 0; i < ETchals.length; i++) {
        const groupChallenges = ETchals[i]
        for (let fullPlanningChallenge of groupChallenges) {
            const shortName = fullPlanningChallenge.Name.replace(
                "UI_CHALLENGES_",
                "",
            )

            if (fullPlanningChallenge.Type === "global") {
                console.log(
                    `  - ${shortName} ${pc.yellow("is global (skipping)")}`,
                )
                continue
            } else {
                console.log(
                    `  - Adding ${pc.blue(shortName)} to ${pc.magenta(
                        group.CategoryId,
                    )}`,
                )
            }

            fullPlanningChallenge = {
                ...fullPlanningChallenge,
                ...idToRuntimeExtras[fullPlanningChallenge.Id],
            }

            fullPlanningChallenge.InclusionData ??= {}
            fullPlanningChallenge.InclusionData.ContractTypes ??= []
            fullPlanningChallenge.InclusionData.ContractTypes.push("elusive")

            if (fullPlanningChallenge.GroupId === missionIds[i]) {
                const contractId = fullPlanningChallenge.GroupId

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
            }

            fullPlanningChallenge.CompletionData = undefined
            fullPlanningChallenge.Completed = undefined
            fullPlanningChallenge.ChallengeProgress = undefined
            fullPlanningChallenge.UserCentricContract = undefined

            delete fullPlanningChallenge.GroupId

            challengeObjects.push(fullPlanningChallenge)
        }
    }

    console.log(`Compiled ${pc.green(groups.length)} groups of challenges`)

    return JSON.stringify(
        {
            meta: {
                Location: locationParent,
            },
            groups,
        },
        undefined,
        4,
    )
}

class ExtractChallengeDataCommand extends Command {
    outFile = Option.String("--out-file", { required: true })
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
                `$0 --location-parent LOCATION_PARENT_PARIS --jwt someJsonWebToken --out-file out.json`,
            ],
            [
                `With API URL`,
                `$0 --location-parent LOCATION_PARENT_PARIS --jwt someJsonWebToken --out-file out.json --api-url hm2-service.hitman.io`,
            ],
        ],
    })

    async execute() {
        const data = await extract(this.locationParent, this.jwt, this.apiUrl)

        await writeFile(this.outFile, data)
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
