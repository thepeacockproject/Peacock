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

/**
 * An escalation group.
 * Format: level number -> contract ID.
 */
export type EscalationGroup = Record<number, string>

/*
 * /profiles/pages/Planning                                     -> type = "escalation", New escalation only values
 *                                                                 (InGroup, EscalationCompletedLevels, EscalationTotalLevels, "IsNew" on Objectives, etc..)
 * /authentication/api/userchannel/ContractsService/GetForPlay2 -> "NextContractId" pointing to the next escalation level,
 *                                                                 "GroupData" with data of the entire escalation
 */

/**
 * A mapping of escalation group ID to a mapping of escalation level numbers to contract IDs.
 */
export const escalationMappings: {
    [groupId: string]: EscalationGroup
} = {
    /**
     * Berlin Egg Hunt
     */
    "9d88605f-6871-46a8-bd46-9804ea04fca9": {
        1: "5452c904-e7e2-4cf4-939c-d3b41dd8dfb8",
        2: "a9e69460-73f2-4928-806d-f79d9e6368bc",
        3: "f5ebd915-3fc8-4cb7-95fd-f666f98e8b45",
    },
    /**
     * The Dexter Discordance
     */
    "e96fb040-a13f-466c-9d96-c8f3b2b8a09a": {
        1: "d5e97d48-e58b-4d43-be35-ec29a51df452",
        2: "3e94d080-c6e4-4a2d-9a7d-74322440c877",
        3: "5db4c764-7ab7-40c1-8688-e2b98176fa35",
    },
    /**
     * The KOats Conspiracy
     */
    "07ffa72a-bbac-45ca-8c9f-b9c1b526153a": {
        1: "a68b6d02-c769-4b22-a470-c7b88f3f3978",
        2: "864b5daa-1322-40f4-9708-04b5eee35317",
        3: "3b160b4f-1222-40a1-9a67-423c05b32340",
    },
    /**
     * The Proloff Parable
     */
    "078a50d1-6427-4fc3-9099-e46390e637a0": {
        1: "645c9dd8-19e6-4cce-87ab-0e731fbaeab9",
        2: "20156bab-35f4-4a61-96f8-271041e38bf6",
        3: "40651beb-edaa-41d0-aa9d-6bd4a14a8f81",
    },
    /**
     * The Gauchito Antiquity
     */
    "72aaaa7b-4386-4ee7-9e9e-73fb8ff8e416": {
        1: "e14bbb5d-bd8a-4b6b-9749-4f147db0ebe0",
        2: "95e7f0d5-f066-4f8c-bfc6-6505c13055ed",
        3: "3849e8d5-3876-48ef-b4e1-9b3a4489589a",
    },
    /**
     * The Corky Commotion
     */
    "4f6ee6ec-b6d7-4958-9838-0352c10294a0": {
        1: "f89027eb-8ed9-49e3-8bb4-a6306f72e3d9",
        2: "2eb41963-a140-4ecb-9a05-327d4fd65408",
        3: "5cb1a153-3b56-417a-8e75-10066bf397b6",
    },
    /**
     * The Cheveyo Calibration
     */
    "b49de2a1-fe8e-49c4-8331-17aaa9d65d32": {
        1: "d201ebf6-adc7-4d6f-87a4-f3d37a116a1b",
        2: "ba68c0d7-d77d-44b4-9401-72b2ff2d73cb",
        3: "e2dd58f3-f5ff-41b3-9ba9-4d0420fc773b",
    },
    /**
     * The Dalton Dissection
     */
    "55063d85-e84a-4c76-8bf7-e70fe2cab651": {
        1: "44ac6a37-0ef8-42ea-bf39-1d5f9afd235d",
        2: "9a25fade-424f-481a-86f0-8c827d43b62e",
        3: "5adfcf3a-0696-4593-b755-c2c8d44f59a6",
    },
    /**
     * The CurryMaker Chaos
     */
    "115425b1-e797-47bf-b517-410dc7507397": {
        1: "cac9f9c2-1a31-4ed8-b2f3-0da9bf5e515e",
        2: "3ef4e3b0-36f3-4c9e-a7bb-e98ae067b41a",
        3: "af09780c-eee9-4478-932c-e21c7bbe10b5",
    },
    /**
     * The Khakiasp Documentation
     */
    "667f48a3-7f6b-486e-8f6b-2f782a5c4857": {
        1: "0677d534-b3eb-46f9-af67-23ff27b8475f",
        2: "b4934ad7-ef15-44cd-9ba1-7752755788b4",
        3: "7153609a-d24a-4f44-905d-d33d0b0b9a73",
    },
    /**
     * The Yannini Yearning
     */
    "1e4423b7-d4ff-448f-a8a8-4bb600cab7e3": {
        1: "c6490c57-a033-4c6d-beed-cf4c8c7be552",
        2: "176e578f-3572-4fd0-9314-71b021ba1bad",
        3: "34674ed1-e76e-45cc-b575-e6f3f520bf7b",
    },
    /**
     * The Baskerville Barney
     */
    "b12d08ea-c842-498a-82ea-889653588592": {
        1: "087d118b-57c7-4f52-929c-0e567ede6f5d",
        2: "19bf57ec-47c1-46b7-9e7f-ecc8309ae0c2",
        3: "77bcec76-323d-4e1e-bd0e-bf6d777c3745",
    },
    /**
     * The Jeffrey Consultation
     */
    "0cceeecb-c8fe-42a4-aee4-d7b575f56a1b": {
        1: "408d03c6-46db-45f4-ab05-9f380eae4670",
        2: "4c41ac07-ad1d-47ff-a2db-3df85108b9b0",
        3: "d71b56ad-4134-4fb6-8e46-a7377a0e2a54",
    },
    /**
     * The mendietinha Madness
     */
    "ccdc7043-62af-44e8-a5fc-38b008c2044e": {
        1: "b7401d91-7705-40c9-84a3-bf8f236444de",
        2: "6ee9d8b0-d0db-426d-bbf6-64a2983b274c",
        3: "ffb1da03-fcbf-4d7f-8371-de685498516e",
    },
    /**
     * The Turms Infatuation
     */
    "0042ab2c-8aa3-48e5-a75f-4558c691adff": {
        1: "cbdd649b-bada-441c-9b0d-1e2d7849b055",
        2: "0d84d2e9-9b2b-4801-bee6-80adf3afe5e6",
        3: "b0719294-b3ca-11eb-8529-0242ac130003",
    },
    /**
     * The Delgado Larceny
     */
    "11e632a1-e246-4641-927b-6fd7daf83016": {
        1: "4e846e60-c98b-4581-9487-083c0353b5a7",
        2: "af558186-5ca1-41b9-ab87-b854345b77b5",
        3: "4f726edc-a0dd-11eb-bcbc-0242ac130002",
    },
    /**
     * The Calvino Cacophony
     */
    "d7cac2f8-e870-4e68-92ba-19b6a88d1053": {
        1: "d265e641-dfaa-4b91-8f5f-227a8bed947a",
        2: "ede95e7f-36b1-4c1b-a4c5-fba9edee296d",
        3: "031097b4-b17f-11eb-8529-0242ac130003",
    },
    /**
     * The Merle Revelation
     */
    "3bdf8b88-c795-4f30-aa69-c04c3d05d8ce": {
        1: "68ac028f-e83f-4496-95a2-eb3c5b8825c9",
        2: "50a56b1f-668f-402d-a6b7-0f759b33ca56",
        3: "b0718c68-b3ca-11eb-8529-0242ac130003",
    },
    /**
     * The MacMillan Surreptition
     */
    "e88c9be7-a802-40b4-b2ae-487b3d047e2c": {
        1: "9f18dff5-6412-4240-91e4-4170d816c0fe",
        2: "c976b9ea-1921-4ce9-8651-dce488ffeb36",
        3: "0310987c-b17f-11eb-8529-0242ac130003",
    },
    /**
     * The Montague Audacity
     */
    "256845d8-d8dd-4073-a69a-e5c0ddb3ff61": {
        1: "309eba43-f514-4ed1-ab9e-9f76547f4b6f",
        2: "69b8a95b-03ff-4d4c-89b1-eb0ca4dbe6c0",
        3: "b0718f1a-b3ca-11eb-8529-0242ac130003",
    },
    /**
     * The Truman Contravention
     */
    "35b6a403-54f4-4faa-9b19-448d6840d837": {
        1: "42c11cac-309c-47ae-a293-ee8bde6918ab",
        2: "31516bfe-694d-418f-89eb-c9b4740af5dd",
        3: "b071900a-b3ca-11eb-8529-0242ac130003",
    },
    /**
     * The Ataro Caliginosity
     */
    "c2e16fb7-d49f-49ef-9d76-46b8b31b3389": {
        1: "044cb8a3-bb83-4484-811a-7644ae1f7b8b",
        2: "c3322acb-bb6c-4f3f-a48d-a654aea83ec7",
        3: "a2e4d7e7-f9e3-4e37-ae56-6739a6f17a4f",
        4: "f4bec62f-0fd6-4071-9bc7-003a5260118b",
        5: "8eed3a7f-b903-412d-85b6-e4262e7246d7",
    },
    /**
     * The McVeigh Ascension
     */
    "9e0188e8-bdad-476c-b4ce-2faa5d2be56c": {
        1: "b5f3a898-fb25-4988-b530-a32ec5b6bad5",
        2: "3c882fd9-63ee-4981-abf3-006a1335c04d",
        3: "4ccf2b51-4a99-4a6d-a37c-31ef5d27e703",
    },
    /**
     * The Mills Reverie
     */
    "3efc73f9-33f0-4af6-9508-7208e6851394": {
        1: "8b3241a8-3a71-43c2-a9b2-2282271ad01e",
        2: "3dd4effa-c919-471d-a3ee-becf7504ce82",
        3: "97c4148b-ecea-4735-87cd-563e9a4ad343",
    },
    /**
     * The Dubious Cohabitation
     */
    "e302a045-0250-4824-9416-675cf936e035": {
        1: "987c40f7-bf23-4f8d-84d6-169101edf953",
        2: "aa3afd89-e080-4bee-83fe-87e26fbd7e3a",
        3: "b071941a-b3ca-11eb-8529-0242ac130003",
    },
    /**
     * The Dartmoor Garden Show
     */
    "5680108a-19dc-4448-9344-3d0290217162": {
        1: "bdd43a59-b74f-4159-8e7d-7209e5a13f84",
        2: "cef8d7c3-35e5-44b4-8c41-3b0f074bf8cd",
        3: "f7ad71b6-9553-4d58-86dc-e3e288849849",
    },
    /**
     * The Barbegue Befuddlement
     */
    "448d89e8-2026-43e3-86f0-205018cbd87e": {
        1: "b82fd894-c12c-44e9-99fd-07b860b76c72",
        2: "2d1bada4-aa46-4954-8cf5-684989f1668a",
        3: "519c097f-2e1f-48f2-8f9d-3c76223cc950",
    },
    /**
     * The Pirates Problem
     */
    "f19f7ac8-39ec-498b-aa23-44c8e75d8693": {
        1: "88725ca6-cf32-41e5-bd18-1c2c9aafd8aa",
        2: "3f5c032b-1429-455e-acfd-5ceab5a4e26d",
        3: "bdd4bdee-6720-44c2-908d-769f58c0cf12",
    },
    /**
     * The Susumu Obsession
     */
    "85a2b618-2e3c-444f-931c-b89d566e45f7": {
        1: "ae4db4c3-32bb-4717-8df3-83d8f77a6d0f",
        2: "7f5d1e2a-9c89-48c2-a370-85d851c3cc21",
        3: "6b1fcdc7-e2c9-48c4-b1fb-0a8dd817f3b2",
        4: "d80abc24-f7d5-4e6b-a6c2-fd318135d160",
        5: "b007a400-66b8-43c3-a919-3195e343f7b1",
    },
    /**
     * The Marinello Motivation
     */
    "d0a0fa03-08a7-43ef-b5e8-d8662d015372": {
        1: "f33d4dee-8d07-45e0-9816-55646dcb341f",
        2: "aa4fb2e6-3494-4b88-a882-43ce135f8b1b",
        3: "9f17c5ee-b402-11eb-8529-0242ac130003",
    },
    /**
     * The Sinbad Stringent
     */
    "be14d4f1-f1aa-4dea-8c9b-a5b1a1dea931": {
        1: "b1f59afe-1b57-470d-80a1-982cb37e0c05",
        2: "4396c59b-9fa2-46ab-8cc8-0bd782225054",
        3: "e928e04a-922f-462a-9b44-0f8e42a05102",
    },
    /**
     * The Agana Abyss
     */
    "74739eda-6ed5-4318-a501-2fa0bd53ef5a": {
        1: "9943bcc6-8897-42b9-93eb-12ff5be8b7ac",
        2: "5548a549-3c55-4014-8cc7-47145f7f75d6",
        3: "bab3704b-0bbb-4d0d-b5bf-ebf715f419cd",
        4: "0434d0ac-5e74-4d1f-8aef-8abbadabd1aa",
        5: "4ed3bdfe-ecfc-41ab-ba6d-25d053838e15",
    },
    /**
     * The dez Dichotomy
     */
    "78628e05-93ce-4f87-8a17-b910d32df51f": {
        1: "4804d74a-96d9-40af-8a37-a1f377781fc1",
        2: "1a9978ae-0cfa-44ff-bd16-ca3ffab226fe",
        3: "0fc24d6e-5870-44d3-897a-15f19c4ccef2",
    },
    /**
     * The Caden Composition
     */
    "ccbde3e2-67e7-4534-95ec-e9bd7ef65273": {
        1: "3c93370d-e6d2-48b3-b37a-8fa27f63027c",
        2: "4e1cac0d-0f16-4c58-ad8c-f5dc003fe368",
        3: "ed54d12a-51e3-470d-b712-cb2a364c95d0",
        4: "79511294-9054-409d-8062-c24d66fb1ff0",
        5: "2e83eda3-230f-429c-965a-c89e7ada97e3",
    },
    /**
     * The PapaLevy Plunderage
     */
    "9a461f89-86c5-44e4-998e-f2f66b496aa7": {
        1: "5e380d27-930d-4bc7-9ad9-411486a7147c",
        2: "d93d8114-3284-4306-80c5-117fa03de533",
        3: "6968e2a0-b7cf-4cb8-8da5-4871d8c564a5",
    },
    /**
     * The Aquatic Retribution
     */
    "69b8eb0c-77d5-42e8-b604-26aba8bd835f": {
        1: "e155844a-032c-4b71-91a4-b1206e0f6a8c",
        2: "3063ccc6-9fa5-439f-9a9f-72a1b81c369e",
        3: "4a0a66d4-0a53-4cfd-8122-978226b4e072",
    },
    /**
     * The Dammchicu Disaster
     */
    "218302a3-f682-46f9-9ffd-bb3e82487b7c": {
        1: "9d0b3322-4dd4-4388-b79f-4aae7dba297c",
        2: "b07af7b6-01cb-4cee-83bf-2c73f71bf2a3",
        3: "45b1b927-5bf0-4dae-bc73-8ee1730652cc",
    },
    /**
     * The Holmwood Disturbance
     */
    "d6961637-effe-4c39-b99a-f2df4402657d": {
        1: "30f4a862-35f8-4f34-ba0d-552ac87ccbbe",
        2: "1e307dd6-74cb-4e4a-9829-50106a95c3ef",
        3: "6cc11563-1101-4c63-9d24-483fca17915b",
        4: "dbd36aab-ed98-47e2-823a-867ba6e070d1",
        5: "4aba4161-608c-4f2c-b1b7-e6669a5eac44",
    },
    /**
     * The PurpleKey Peril
     */
    "74415eca-d01e-4070-9bc9-5ef9b4e8f7d2": {
        1: "f556bfdd-3be1-4f1b-9a41-5c6747766262",
        2: "97ab1c9a-3236-41f0-b22e-b46728ffc9fd",
        3: "490cbf23-92ca-4cdb-b301-9a576442ad2b",
    },
    /**
     * The Hamartia Compulsion
     */
    "4b6739eb-bcdb-48ad-8c45-a829794175e1": {
        1: "56684a64-70c1-4845-a2c4-b49ddd78a45e",
        2: "7d911fca-b4bb-4b31-8564-5f5fd7b82a9b",
        3: "daf0ab18-dc1b-481b-9731-3aec536f231f",
        4: "e11b70db-f436-4eee-ac69-8d76eb1d3e9d",
        5: "d48ed63e-2542-4215-8e6c-6ad3c29feb42",
    },
    /**
     * The Argentine Acrimony
     */
    "edbacf4b-e402-4548-b723-cd4351571537": {
        1: "4bab4282-ad93-45e3-ace7-c9daf78dec94",
        2: "1e96f1f2-eaf7-4947-a60d-d2190f503b0b",
        3: "a7ddf3f3-7fd9-4749-b63b-f2579bbd0f6c",
    },
    /**
     * The sleazeball Situation
     */
    "35f1f534-ae2d-42be-8472-dd55e96625ea": {
        1: "3edb330f-5129-49c6-9afd-70111ce72ae5",
        2: "c59baa15-5946-4354-875e-1c98ef7f1bfe",
        3: "83655c86-012f-4d2b-a57d-5b021af99af1",
    },
}
