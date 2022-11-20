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
     * The Treasonous Mimicry
     */
    "be3ea01f-ec56-4fcb-95ec-164a1d9980f3": {
        1: "f46a799f-1387-483b-abe1-25be8b5ffded",
        2: "8f25f1de-69bf-4677-b8f0-11f1026df140",
        3: "c28beef7-e223-4057-9701-db855c05744f",
    },
    /**
     * The Sweeney Scrupulousness
     */
    "782a2849-14a2-4cd4-99fc-ddacaeaba2dd": {
        1: "1628c270-8159-421b-9b7f-fafcb3737463",
        2: "ce6714b4-6df4-4634-9da7-07934dde6747",
        3: "c89d7f7c-eb2f-4530-9e06-1d6ad5187d8e",
    },
    /**
     * The Bartholomew Hornswoggle
     */
    "83d4e87e-2f47-4c81-b831-30bd13a29b05": {
        1: "2a16d498-664e-47c6-a79b-7b5ba403f85a",
        2: "0c6308d7-7646-4b38-9351-d22e2ae659c1",
        3: "c5ef7b7a-3cfb-4b99-a566-8b3ab4b36436",
    },
    /**
     * The Babayeva Dissonance
     */
    "4fbfae2e-a5e7-4b79-b008-94f6cbcb13cb": {
        1: "724c5688-7851-4e24-9c35-88bab2a57c90",
        2: "f0495457-6e26-4e19-b5b9-1e4957e27755",
        3: "04fdd55f-2ac5-4f1f-aa8d-00a9b0c6dfc4",
    },
    /**
     * The Scarlett Deceit
     */
    "dbb0e22d-084b-4b57-8616-42290982fd90": {
        1: "4c8480a9-359b-44d8-8e17-08430b7d01f2",
        2: "1bda5f46-3804-46b6-870a-fa352288fb2f",
        3: "e04758d6-fb6c-4854-a0bf-753b80e93e96",
    },
    /**
     * The Rafael Misadventure
     */
    "e63eeb62-29ef-428d-b003-ea043b1f11f9": {
        1: "dfc9ddf7-a0e9-4b4f-af8d-5076c0d6bf0b",
        2: "c02d4852-0dbd-4f65-bb9a-17ecb129b775",
        3: "6ada7787-9a8f-474a-aa96-af9407a02b6f",
    },
    /**
     * The Marinello Motivation
     */
    "3721e543-b5e6-4af8-a4fc-c92e9a4453bd": {
        1: "f33d4dee-8d07-45e0-9816-55646dcb341f",
        2: "aa4fb2e6-3494-4b88-a882-43ce135f8b1b",
        3: "2ab943ef-ba1b-48bf-9391-5b7725b4d4c7",
    },
    /**
     * The Quimby Quandary
     */
    "b66f151d-47a7-4681-a403-c48a46916224": {
        1: "f022db57-d9f8-4d1a-aa9d-d27622bc5fc7",
        2: "1829ad45-92a2-4c4d-8d42-08769d219be5",
        3: "778f0ff0-fd13-4c7d-b120-a6bf75421c63",
    },
    /**
     * The Aelwin Augment
     */
    "8c6daf5e-5974-4438-af20-71ff570c7ff3": {
        1: "e476863f-2c3c-4447-8b15-8ffeddcc7923",
        2: "fe749a4f-2b0b-4fae-ae7d-9e107782944e",
        3: "952dd0bc-29ec-4080-b179-c1c0db8c3dc6",
    },
    /**
     * The Unpalatatable Termination
     */
    "fca539ff-1b1a-4c04-93e0-03b9b902f86c": {
        1: "66d30da2-ee73-4f6b-9059-82bdd2a1cde6",
        2: "dc085fde-0ad7-4d9e-b233-eff219c95258",
        3: "f88cda79-c07c-4487-ac23-1b8b824b3497",
    },
    /**
     * The BigMooneyFlamboyancy
     */
    "066ce378-0418-452a-b02e-a5e4ee711096": {
        1: "48e2fa8d-e6bd-4eb6-9020-0d0191b49e29",
        2: "b0b3cc31-8cff-4042-ad85-1328860e42be",
        3: "f57fd6a8-cf49-499c-b560-bd377a00ffcf",
    },
    /**
     * The Covert Dispersal
     */
    "1d5dcf3e-9682-4e32-ac11-ad6586daa456": {
        1: "ea24b9a0-c942-424f-b358-2ed1cc6ecd74",
        2: "bfe54e24-3491-4485-bc07-301f22461172",
        3: "7f05929f-f1c7-49f7-9428-c9a847b12a87",
    },
    /**
     * The Batty Tranquility
     */
    "74e6b561-ff1a-4742-9a7b-890b7818c796": {
        1: "246b802f-2e9d-42a7-b9b7-7ef55beb3110",
        2: "a3d5cd5e-a47f-40ac-8ba9-77fea52ee995",
        3: "d7bc0701-e9c9-465c-a1af-561863697fca",
    },
    /**
     * The Riviera Restoration
     */
    "719ee044-4b05-4bd9-b2bb-75029f6d2a35": {
        1: "78875559-8efb-428d-94d5-90494cede7e4",
        2: "b4a77622-5481-4084-88a5-a523c548a38e",
        3: "e5b6ccf4-1f29-4ec6-bfb8-2e9b78882c85",
    },
    /**
     * The Simmons Concussion
     */
    "5284cb9f-9bdd-4b00-99c3-0b5939b01818": {
        1: "bb0edb91-e7ba-4e3d-9a11-df367d69f110",
        2: "b47909db-377d-446e-816a-3c8276ef4560",
        3: "dcc17268-84e5-4f49-badf-f0c631ab28cd",
    },
    /**
     * The Raaz Algorithm
     */
    "b6a6330a-301a-4e8e-a26f-0f3e0ea809b5": {
        1: "89018432-d2a9-412e-ba2f-e070cfa11f7b",
        2: "c4b60bf8-620e-4827-9f1a-08292b5af6a7",
        3: "3bf086b7-2fb6-49b3-bd95-7f46535801df",
    },
    /**
     * The Chameleon Anonymity
     */
    "ae0bd6cd-7062-4336-8cb0-5fafad3d0f4f": {
        1: "36fc1e05-14fc-4e49-a626-2b64e642f1e7",
        2: "07787ef6-7f9a-4aa5-a5d8-2c385c708057",
        3: "2469e028-6d85-4b50-a54c-a32c36792241",
    },
    /**
     * The Han Encasement
     */
    "9badee3e-0014-46b1-9ef6-edf8858ba038": {
        1: "e3191aeb-8eee-4da5-837d-e368a9cbbaca",
        2: "e409fcc1-30db-460a-826e-8600b58a8377",
        3: "dc16d4c4-f9a5-491f-a2f4-2c0b8e0a66a3",
    },
    /**
     * The Divine Descendance
     */
    "4a62b328-dfe7-4956-ac0f-a3a8990fce26": {
        1: "d4203028-f0ca-4c15-9bad-5b092d715d02",
        2: "fc25e5b3-e98e-433b-8cdb-6d479159a2fd",
        3: "d6f4777a-14df-40c6-a541-d8c974d9d4a1",
    },
    /**
     * The Hirani Evacuation
     */
    "b47f34cb-6537-421c-8fc8-720a4a118540": {
        1: "929298e1-821f-47de-bbc5-aea00002b0c8",
        2: "fdd78676-ed12-45b8-912a-a08c7abd3e54",
        3: "469ce2cb-a2d1-4296-bfe6-8a95bbf43fac",
    },
    /**
     * The McCallister Ransack
     */
    "d1b9250b-33f6-4712-831b-f33fa11ee4d8": {
        1: "0170bac0-86df-43f5-9ae7-0a7aed457e35",
        2: "8ae81931-0e6f-4442-9e3e-7ba4f639dc3b",
        3: "a1e125fe-b9ac-428b-8ff0-2ba5a3d508dd",
    },
    /**
     * The O'Leary Conflagration
     */
    "15b7ad4e-565a-4fdb-b669-c9a68176e665": {
        1: "088ee359-93ef-414f-a94f-f0e705cc7382",
        2: "1515385d-83c9-48f4-a030-a887de9298a8",
        3: "abddddf9-3dbc-46cb-a8e4-087418d97435",
    },
    /**
     * The Nolan Disinfection
     */
    "fe088a10-5dbf-460f-bbe2-6b55e7a66253": {
        1: "c4306fa7-347f-44e8-b24d-e5ded9d0e58a",
        2: "34d8d1df-1b39-4a9c-9a07-45b83667fdb2",
        3: "5a2a91be-4591-40f7-aada-f55fce0cadbe",
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
     * The Einarsson Inception - SNOWDROP
     */
    "aee6a16f-6525-4d63-a37f-225e293c6118": {
        1: "2506636a-8b25-492c-b3e1-676ff6d8474a",
        2: "ccd2ffef-cc0c-4b95-a549-51cecc415cab",
        3: "0f971019-c2cc-4b61-8404-3b394b41dc2c",
        4: "33a14cc8-e922-4b65-9945-516dc2768426",
        5: "e71bb57e-cba6-4b47-bdb1-2c89319d7e45",
    },
    /**
     * The Snorrason Ascension - WOLFSBANE
     */
    "c469d91d-01fc-4314-b22c-71cb804e92c0": {
        1: "d4883292-d0b8-4a5c-8711-f5a3a1ae58f6",
        2: "a562b31c-7b80-4cbb-88e1-6980ed6824ea",
        3: "d318f06b-d8a7-49b8-ac4a-69982fe90b39",
        4: "b33e1f43-0143-44ab-9146-f030a9775a2b",
        5: "dac764bf-d07f-461b-8f51-a511ed64a20a",
    },
    /**
     * The Gemini Fiasco - ANEMONE
     */
    "77c7b56f-2410-4919-a4bc-64435c6cff55": {
        1: "80b099d6-ab46-4505-8415-c9971022cac3",
        2: "29d25fb4-27b0-4738-94c5-f9e361ad9b53",
        3: "b68d2e29-d524-48bc-8aae-9f3004b1b5cf",
        4: "9f91d926-eed8-4c3c-928f-055de1822a2d",
        5: "a08d65bc-3a72-4202-8d8e-c03444d2ba51",
    },
    /**
     * The Kotti Paradigm - BAMBOO
     */
    "162e9039-cb05-418c-ba8f-792fc6cc5165": {
        1: "8dbc9542-8eca-45ea-9471-36002e5eded7",
        2: "dc3a4e81-c13f-497c-8e31-05d90d29e837",
        3: "ad80e67c-fa4c-4c29-b834-9b1f23bcf02a",
    },
    /**
     * The Osterman Mosaic - BLUEBELL
     */
    "5746f21e-efa1-4787-a9ca-99a5f233f507": {
        1: "b4870ab6-b2c8-45b1-a1f0-9cb617bb7433",
        2: "bd45480b-29d6-4e15-ae2a-d64eab54a00c",
        3: "85c5c73b-eae2-4fcb-9791-68671ea595aa",
        4: "2c170d4f-89d2-430b-8812-bd3a38be7f59",
        5: "6d60b35a-c41a-45a3-bfc8-16b6959ffdb9",
    },
    /**
     * The Marsden Isotopy - CLOVER
     */
    "edeca4db-7394-4e93-9b6d-00581f16d6c1": {
        1: "a8b5f606-99fa-4d50-a650-9598a121cf4b",
        2: "324cdd81-a870-494e-8ca1-b8a4ce251676",
        3: "12dc3bb7-3397-423d-aba0-2bab51362879",
        4: "3c9927ee-c231-412b-a461-7b2884606b45",
        5: "0ec2eabf-a9a5-4660-a143-ec194abe27ea",
    },
    /**
     * The Perkins Disarray - CYCLAMEN
     */
    "39f03892-a841-4775-91ac-f8c91b485505": {
        1: "c6440643-0e2f-4321-8de4-6b877f015147",
        2: "eb340d27-39fa-4e42-baf1-216363dbcdfc",
        3: "38effc92-c5db-4cc4-b0fa-43f4dfa34995",
        4: "7413e00d-29b7-46c5-8cab-969c3660281c",
        5: "49b24fc5-582b-4314-88a5-f282171b9a56",
    },
    /**
     * The Hexagon Protocol - FOXGLOVE
     */
    "ebf8e5b5-3bf0-487e-8d1b-9473aee61291": {
        1: "c6ccb4ef-0feb-40d9-8f1b-80fd6ad06e08",
        2: "b8b55d97-dfe9-4776-8f64-1cfcd2dfa20a",
        3: "62f17649-be17-4b2d-aeef-be6689251915",
        4: "01d00202-c08a-4fa3-acd6-4a17eeaee2a1",
        5: "739e624b-2851-4925-bb5c-f86e8d196aeb",
    },
    /**
     * The Teague Temptation - GOOSEFOOT
     */
    "bfb0d544-b4c9-4533-bed4-4562a43a3f40": {
        1: "e22b9844-8b4b-47e9-8401-4938bc1e038d",
        2: "e4d4c3fa-e65f-4c03-b1ad-3cd550696f5c",
        3: "9a10bdf7-f289-4a88-972a-c31d5a860ff9",
        4: "81e33608-8fe6-43a2-b55b-26b50b64bc32",
        5: "3e5d074c-ec66-4b27-bacf-9e96a01cdd62",
    },
    /**
     * The Adrian Eclipse - HAWTHORN
     */
    "e6be23e8-8602-42c8-a014-17ffbfa053f5": {
        1: "3554ebd7-b190-4cb5-a267-46f3bda8cdde",
        2: "1039e6e9-2961-4595-bf1b-c456a82c2653",
        3: "bd3c6179-42bc-4844-85c1-e01a6a1ea821",
        4: "a02562b8-1d33-41d4-b3f6-0338b90eaae0",
        5: "541bcd99-44dc-4e0a-8520-15a528223cac",
    },
    /**
     * The Videl Cataclysm - JUNIPER
     */
    "e01113e6-f27d-4ea1-a8ba-93062335bbf5": {
        1: "5fa7fc7d-daf4-4c6e-84bc-fd854c8c2ebe",
        2: "08a5b11b-5b04-42f3-98c4-b12fdd4097fc",
        3: "4e9c89d2-8acc-48af-b147-20aafb6df8dd",
        4: "63ac5e2c-d634-4b11-8a57-d1bb03d41b1e",
        5: "150cfa6d-6be8-4b79-930d-07bd3ccde952",
    },
    /**
     * The Wetzel Determination - LARKSPUR
     */
    "51038604-c3f4-41e9-889b-25d9d5de93c6": {
        1: "9d8814dc-ed19-4b4a-8590-2bb9f957ba29",
        2: "00881a0d-7eeb-4329-a733-fc23e59a5dc1",
        3: "89d637e6-5a3f-4266-a8f1-32c8d804ae06",
        4: "5792ca6f-7bb4-4b16-af21-15f5f4398aa7",
        5: "da459b80-2cb2-4c99-b57d-9531c10e34ac",
    },
    /**
     * The Mandelbulb Requiem - MARIGOLD
     */
    "ced3ecb8-70ab-40b0-b033-6f6235c61900": {
        1: "871eb4fc-6572-4f2e-948c-377ee4339927",
        2: "5a67d839-18f2-4925-90c3-f6639b9b8728",
        3: "11839cdf-ac4e-46a9-9004-8c5e93d231cc",
        4: "34db98fe-7d3f-45a4-b37a-097410449423",
        5: "8e16b428-5de7-4c56-a3ab-a1e244488ebc",
    },
    /**
     * The Adamoli Fascination - NICOTIANA
     */
    "c1db299f-3037-4726-b9fc-5cd951c45812": {
        1: "09d63e1b-39f2-4d1f-b212-a60980734f41",
        2: "434b17c5-8666-4b60-9a63-076c71ebfdc5",
        3: "7e70e579-726f-4ebf-a409-84efb6be4f5a",
        4: "4d5950b9-5baa-4d29-a627-b4ecd7930744",
        5: "0aac363d-3e5d-4e9e-8d27-b890c0a8d3b5",
    },
    /**
     * The Seeger Beguilement - NIGHTSHADE
     */
    "0e5c23b1-4678-458b-ad98-8b55c268e90a": {
        1: "329617f2-7454-4cb7-95e4-e02725263bb1",
        2: "ce869624-c9e0-4778-b053-e86be6d07bc2",
        3: "3a9fddda-43a6-4f0b-8cf0-bc68098143fd",
        4: "79db896f-2141-470b-b25b-fd603a7e347d",
        5: "4b30ac0d-be8b-43f0-8894-277ad4bb8074",
    },
    /**
     * The Kerner Disquiet - PEONY
     */
    "e75663c8-afca-45a1-af18-25fe3e663848": {
        1: "9f2af10d-1826-4fe5-bea6-de8c23f2c651",
        2: "3d15a639-f5cb-484d-a167-ae5ababd6739",
        3: "48d58415-938a-444a-89c0-4b722d217c28",
        4: "b3076a7d-247b-4252-8c2b-eabddae71ef2",
        5: "7bf14497-f478-4cd7-b35f-b04933ca80bb",
    },
    /**
     * The Shapiro Omen - PRIMROSE
     */
    "2e365b7c-817d-4213-8fb1-496fa8067e7b": {
        1: "b7fb6444-1675-461b-b966-4a46657d8f5b",
        2: "4324c417-9200-4e72-a3fe-a3e65500a2a9",
        3: "0ca20c81-83f7-4850-ad39-dee34f3aaf22",
        4: "87532edc-a71b-40f7-86f5-bef01e87d0fc",
        5: "29bc2f85-79ea-45b3-a9e0-bd4abcee1e67",
    },
    /**
     * The Ezekiel Paradox - TULIP
     */
    "a1e7fdb4-88a4-4dbd-9ef2-d9bd1762cec2": {
        1: "e853782d-6484-48d4-a941-4a9821763802",
        2: "172803e8-28fa-4288-941c-a7dd6e1cea2e",
        3: "16a0120d-413a-4a78-a6da-e013899569fe",
        4: "9c0d6a91-d3c6-4393-9cd8-960fd44d7360",
        5: "23ded45d-c08c-4077-bdc8-ec4118bc70ce",
    },
    /**
     * The Granville Curiosity - WISTERIA
     */
    "54e6c794-2855-4ecf-acc2-d7710d5d96d1": {
        1: "46a1144c-238d-40c5-8a6e-2dd5283f32e4",
        2: "ab9f0e85-c489-4852-9fa4-ddafbbfc2be8",
        3: "c4272d39-5e2d-4c21-9db6-7359a29d2d6f",
        4: "15e2b1e0-2929-4f89-b166-cf44e1736a80",
        5: "390c756e-9fce-4100-8063-4b89eebfd91b",
    },
    /**
     * The Szilassi Darkness - ARTEMISIA
     */
    "994540ee-3900-4a41-9544-17b2196a4b1a": {
        1: "e4030267-53db-4776-ad58-21332ab39835",
        2: "2cbce64b-0d9a-4993-9a22-f39710c412d0",
        3: "480950c6-ab74-487c-bddc-d1ad763b3a11",
        4: "837e5158-4d6a-4091-8dcf-4040d1e83750",
        5: "8500f8dc-d6d8-4fb1-9df2-e8159d8a740e",
    },
    /**
     * The Eccleston Illumination - BEGONIA
     */
    "95bb86f8-fbbf-4eb0-b2fa-bd379c0a4878": {
        1: "089e1ef0-d620-4f6a-9dca-4cc75cc4cf86",
        2: "de18866c-8cd8-475e-99be-becaed1d2b0a",
        3: "28b063b8-3f11-42da-abc9-46ca08736f37",
        4: "7b08ab7e-0310-430e-8b1f-66351eeacdca",
        5: "220d41ad-105f-44a4-b532-3f1942da88c3",
    },
    /**
     * The Zunino Disintegration - BERGAMOT
     */
    "5a8bdb42-b11e-47d1-bc57-b4bf7efa9eda": {
        1: "5d77ad4f-77e2-4cee-842f-5297add740f3",
        2: "cfc1a7d0-3a86-4a11-bae9-efad95752db9",
        3: "00561b3a-81fa-48eb-83e5-c83275d2b114",
        4: "6abced1a-41de-4bf8-8701-bfe1ed9d948b",
        5: "bff960fb-8206-47b7-8163-6dcd71c781f4",
    },
    /**
     * The Gladwyn Simulacrum - CHRYSANTEMUM
     */
    "d43600cd-1128-4d59-bf87-075c73ae9776": {
        1: "ec1d3527-8a6d-4ac6-b105-46f1b0f1ce48",
        2: "0903a955-230b-4792-967c-a801ef135844",
        3: "ef1bd7f9-5605-4232-af0c-050416589ac6",
        4: "61e9cab1-50a0-41d7-95f5-147a16244cf7",
        5: "cdf92d1d-b08d-4427-aa40-56bbfa5a10d3",
    },
    /**
     * The Scorpio Directive - DAFFODIL
     */
    "3d9dcf91-1708-4e22-88b3-41d184bcc8c3": {
        1: "fffda772-d51d-46e2-86fe-44c72e38bac4",
        2: "e6fb9365-1c13-4fe7-8e69-b287dc4526c7",
        3: "e87ecf0e-e918-4521-927b-1a97ae4583aa",
        4: "ded3b862-7626-43ff-8510-e2758121bf00",
        5: "d3ea9e2e-85dc-41f1-b1bf-a478879ff8ba",
    },
    /**
     * The Selmone Mimesis - EDELWEISS
     */
    "0c4c6ce2-09d5-4fff-a946-099ced0558ea": {
        1: "5cb0a941-6db4-4923-a7b3-dc7902a17b06",
        2: "0272d94e-8f97-4a3d-88ca-be8eb61bd0a9",
        3: "85131a19-2737-4446-b9b0-5742d6f66521",
        4: "6157c2d0-b344-4441-900e-056a98507079",
        5: "59b2c722-9728-4e8f-a432-3ccb1d6a31f6",
    },
    /**
     * The Andersen Animosity - HYACINTH
     */
    "ee7e831b-f7ea-4803-8eba-80b42d020a7c": {
        1: "579942d4-5df2-4342-8c04-26840aa996e1",
        2: "1134bcdb-6cb7-454f-b02c-69806ac826e7",
        3: "902eb6ba-00c2-49ff-b51f-bd0a99f8ab3c",
        4: "67dd233f-a311-494e-90ca-df4fc2bc80b7",
        5: "40b08d95-82cf-4053-869e-0a110beb6dbb",
    },
    /**
     * The Lyndon Gyration - JASMINE
     */
    "641656f8-ab16-49c5-a09b-952738154b64": {
        1: "f00e7bc4-11bf-4413-a8d2-64db6afd7ad4",
        2: "bae8f1c2-ecb5-4db1-ab4f-970a54cc3fbb",
        3: "623dfe20-a903-4444-9c5a-a09743b58d22",
        4: "ede26656-f04d-41f3-804e-0f5875b91ea4",
        5: "0519bc57-8666-49c5-aaef-52423707c3a7",
    },
    /**
     * The Scarlatti Covenant - LAVENDER
     */
    "525bd318-04e6-4672-9d01-6bba74362fc5": {
        1: "162c0a51-e3bc-4de6-a468-521f516de15e",
        2: "7bebfc98-89c9-440e-af52-9040abad36a1",
        3: "666516e4-9527-4925-8d4e-6e230fcb2ee7",
        4: "ff1c0065-3d05-4cbf-a8b1-c5d9b5b94ed6",
        5: "e2d7929f-9774-499a-bee6-7484719db474",
    },
    /**
     * The Apeiron Sadness - LILAC
     */
    "fab808f9-e88b-4775-aadb-a462c86bf2d9": {
        1: "15c0cc5b-5873-4a8c-9447-f576abda8b96",
        2: "691d16fe-2f83-4f9f-8a3c-39b4dca15093",
        3: "ab7e7b06-3fcd-41ba-b185-0775dfb3e24e",
        4: "aec8fc1e-ca62-4acd-8be2-488935853f85",
        5: "689774c7-7059-42b5-96f8-a78f9fb31240",
    },
    /**
     * The Sigma Illusion - ORCHID
     */
    "f08934c0-73f3-460c-a612-231035131c96": {
        1: "7e31a12e-0d6e-40c3-8db5-3bb4f79a939d",
        2: "a811e092-61c5-45d5-b5f9-2427e2256a3f",
        3: "e918c6bf-0961-4ab9-b024-e9e1277c1506",
        4: "62175a5b-824a-4be2-bffb-14a263e403ac",
        5: "5f96ef53-926c-4e49-b3ec-93b2fbe51ccf",
    },
    /**
     * The Spaggiari Subversion - ROSE
     */
    "8dec1e62-bbf9-438c-8495-24559c884466": {
        1: "b32eb348-4604-4f30-8f36-39b5b1895cdb",
        2: "60028d72-deaf-4b03-9982-9d5caf838ef7",
        3: "48bb5917-53bb-4927-83c6-e2b41a8c769a",
        4: "0844669e-4e9f-4696-9c3b-99e574f59496",
        5: "32c0c431-259c-45d7-ba47-5244a6b54818",
    },
    /**
     * The Lupei Sensitivity - AMARANTH
     */
    "c949817b-5212-42e8-9b06-9a2eb83de167": {
        1: "11e67595-2500-4c55-a1dd-60714763d9cc",
        2: "33300419-4aae-43ee-8c6a-7f01269abd6d",
        3: "6687ad91-054e-48d4-b9d2-851633865d99",
        4: "56aac990-940c-4cd4-b828-0a74000d54a6",
        5: "15998e88-bf9e-490b-8f91-a218ee2a5739",
    },
    /**
     * The Varvara Mystification - CAMELLIA
     */
    "ebf8ab97-6ff3-4063-9737-c6f237031de7": {
        1: "96146d21-680b-4940-883f-b1cd399af6df",
        2: "848ff78d-7fe5-4a29-b175-e5fb27a7a8f0",
        3: "683578d2-9f30-4c0f-83ce-c12a1b8be278",
        4: "1bdb49e8-2d79-41ed-9754-2495b656adf6",
        5: "5f2e6507-61a8-4e9b-9965-39dbedd9f122",
    },
    /**
     * The Reziko Conundrum - CLEMATIS
     */
    "896233eb-e7c5-4915-bf2b-5867799d8bb4": {
        1: "023f4657-55c8-4704-b8a0-4aa35be5ac74",
        2: "1f916ebc-41aa-4f80-8144-fa5385c9ac7b",
        3: "d6cb9151-93fe-4dfc-a08f-91f54832c898",
        4: "118e5233-9f79-4853-b432-5718fb16738f",
        5: "cf8fc99a-a0d3-4e9c-871e-c01556ff3183",
    },
    /**
     * The Sokoloff Sophistication - HONEYSUCKLE
     */
    "c67a1ead-7489-4d88-bbd2-c68d735e5df0": {
        1: "451cf387-b705-4700-a174-db2b11d5f57a",
        2: "1a8e5451-b888-450a-88d9-df038aed2750",
        3: "17d32b7e-3ae2-4a77-ab5b-6415d2c34a33",
        4: "842f781a-ab23-4932-81d1-8e2ee66538cc",
        5: "0f71205e-689a-4bb4-b3cf-bc7808d2b048",
    },
    /**
     * The Bahadur Dexterity - IRIS
     */
    "19660896-fc1f-49f9-b56b-2059137530e4": {
        1: "9d0539b6-1f3b-4186-b077-910719b1bf3c",
        2: "34511e96-28b8-43a8-a575-bce4c778fd9f",
        3: "d46d7214-16f2-4009-9d9c-a65c323baf08",
        4: "cf7420e6-5b35-442c-8ca7-62ad9ebde523",
        5: "e6ec6b2e-4f6b-44c7-bb3d-ace5482471bc",
    },
    /**
     * The Raskoph Satisfaction - LUPINE
     */
    "11c93649-6b00-46ac-bf2d-a3599a6ab3a9": {
        1: "68d2a689-1129-468a-bd51-7e1e96a51883",
        2: "d1683e6a-166c-479f-be31-8bb526e5e56a",
        3: "d043c13c-c689-409e-8001-c617086dcffc",
        4: "f16304ac-8953-4849-9bf2-afc51ca36729",
        5: "daa5596e-61a8-4a1b-b979-fb5501c3d956",
    },
    /**
     * The Kilie Agitation - RHODODENDRON
     */
    "45e6d255-f8e4-4170-ad7e-3416ab8a881d": {
        1: "6e739ee1-561c-4b94-a46d-054225481354",
        2: "91bb0bfd-a3d6-4205-bdce-55d64d157bcb",
        3: "286b8947-d7d0-4968-a13f-abe0ac96ad78",
        4: "19f96d98-6e8c-4860-9995-a34db30b51ac",
        5: "911476b2-fd26-4e4e-a8c3-3201a27a6cc2",
    },
    /**
     * The Ignatiev Integrity - SALVIA
     */
    "e359075e-a510-4b7c-a461-477b789ca7e4": {
        1: "46420edc-2eae-4399-b4c2-f1355e818744",
        2: "854e1d09-ed26-43fe-9c24-b1766eeaca78",
        3: "4ab2babf-b5ce-44d8-a463-94bd70b8abff",
        4: "22f1fb46-11cd-4a95-9baa-d58144a27363",
        5: "e1d60c32-e4aa-4461-8139-2a37e90b6eb3",
    },
    /**
     * The Asya Attunement - BLOODLILY
     */
    "45c831c4-b455-4d21-90f3-6f09b28ee01b": {
        1: "c0604552-7a5d-448c-9944-1c3fc7982162",
        2: "eafeed34-340e-489c-bae2-5017de8d19ba",
        3: "18b5ad80-1f48-4712-bd50-6e7298046b3f",
        4: "9d96898e-318e-4994-bdbe-c5f081d466f1",
        5: "de38d516-b4ab-4539-b9b1-89b475f372bb",
    },
    /**
     * The Arthin Occultation - DELPHINIUM
     */
    "f425e64f-99df-4ebf-9f7d-909a65a26aef": {
        1: "a3caa4a2-c53c-4704-a02f-cf7a5065d7ce",
        2: "63295d98-4cfb-4491-ab7d-04368dcad083",
        3: "8bea845b-0f3e-4494-bfa3-aba04287c95b",
        4: "803448c1-b263-4831-b36e-49255fd0d108",
        5: "e33119f9-074c-40ab-bcdc-a814c94af747",
    },
    /**
     * The Somsak Equation - GERANIUM
     */
    "1f785def-03b7-4340-af7e-2f5831e77eb5": {
        1: "7a158429-6cad-4cf5-ae28-561417ee4985",
        2: "168fcb36-bc80-47fc-bf99-05acee0a0f89",
        3: "4206e31b-4eaa-4519-8be3-1eeb1f514c8c",
        4: "08fd97eb-5ac1-4586-a562-2141050abc0e",
        5: "8039ecb0-d903-4b7c-bfed-63c70f895e6f",
    },
    /**
     * The Farley Crescendo - DAISY
     */
    "c5d88e8c-437b-476b-afe2-d94aa4293502": {
        1: "7dcb6609-73ee-4501-ae42-4cad1efd4d35",
        2: "1284d25b-9ca3-4a91-891c-f33ae26ca401",
        3: "a7032a55-02b0-4f79-b20f-0216d148d73a",
        4: "36013ae0-4ff2-4142-8625-a35f138d32fb",
        5: "0a6f7d38-4bc3-49c2-ab06-7fd99b2bc6b3",
    },
    /**
     * The Otaktay Obliteration - SKULLCAP
     */
    "e6f4d3a4-9a33-4bd9-b761-da297069cf8c": {
        1: "c3c4a67d-891f-4de2-b47c-0a614369189c",
        2: "d797ff73-973c-4376-ab07-f17e47c0eb70",
        3: "1604cbe1-8704-4d26-9fd2-2bcf6fc676b2",
        4: "d36e1af8-6169-45a5-a8f4-4bfd639b7d7d",
        5: "aa456df8-2294-4e29-a792-fc0f46576830",
    },
    /**
     * The Mallory Misfortune - THISTLE
     */
    "4186dd23-1cfc-4ba0-9863-9f19f7cba249": {
        1: "237cdfdc-6877-4172-ba01-1eb694c88607",
        2: "747b25ba-8b20-4426-9108-a3639fb92f60",
        3: "dddcac6e-49d1-4634-bf81-e6976a5225d3",
        4: "9cd62772-df2a-4e17-a09b-d24477947a8a",
        5: "fc6ec4fe-59c7-4c2f-8dd1-00635e29239f",
    },
    /**
     * The Yuuma Tenacity - ASAGAO
     */
    "a1e5f4f4-ea9c-4a42-b826-50a212026d50": {
        1: "278a7377-dc8f-4fa4-961a-8e96733dcd52",
        2: "a9b9dbc5-3e90-444c-8883-5c323d9180cc",
        3: "db8a396a-bd15-4d05-b1e3-ac767a5d60bb",
        4: "0a93e6bd-1cbb-41a5-8f8e-368e19633f87",
        5: "35ed4c87-e6af-4279-8555-22d167b59197",
    },
    /**
     * The Meiko Incarnation - KOSUMOSU
     */
    "88451dd9-4b57-441e-9eab-e20b9879bafa": {
        1: "3919b190-0ed3-455e-a98a-c048b00dc6da",
        2: "ebdb2f68-4abf-481e-a501-6db34612584f",
        3: "c16896e5-b3e5-4570-9c2e-ecb655cdf127",
        4: "7fd115ca-a3ab-4997-9284-99843b1ffb4e",
        5: "7ec4bbd5-6c02-4640-b5dd-4e604081b4d2",
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
