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

/**
 * A mapping of location ID to an array of missions IDs.
 */
export const missionsInLocations = {
    LOCATION_ICA_FACILITY_ARRIVAL: ["1436cbe4-164b-450f-ad2c-77dec88f53dd"],
    LOCATION_ICA_FACILITY_SHIP: [
        "1d241b00-f585-4e3d-bc61-3095af1b96e2",
        "b573932d-7a34-44f1-bcf4-ea8f79f75710",
    ],
    LOCATION_ICA_FACILITY: ["ada5f2b1-8529-48bb-a596-717f75f5eacb"],
    LOCATION_PARIS: [
        "00000000-0000-0000-0000-000000000200",
        "4e45e91a-94ca-4d89-89fc-1b250e608e73",
    ],
    LOCATION_COASTALTOWN: ["00000000-0000-0000-0000-000000000600"],
    LOCATION_COASTALTOWN_NIGHT: ["00000000-0000-0000-0001-000000000005"],
    LOCATION_COASTALTOWN_EBOLA: ["7e3f758a-2435-42de-93bd-d8f0b72c63a4"],
    LOCATION_COASTALTOWN_MOVIESET: ["00000000-0000-0000-0001-000000000006"],
    LOCATION_MARRAKECH: ["00000000-0000-0000-0000-000000000400"],
    LOCATION_MARRAKECH_NIGHT: ["ced93d8f-9535-425a-beb9-ef219e781e81"],
    LOCATION_BANGKOK: ["db341d9f-58a4-411d-be57-0bc4ed85646b"],
    LOCATION_BANGKOK_ZIKA: ["024b6964-a3bb-4457-b085-08f9a7dc7fb7"],
    LOCATION_COLORADO: ["42bac555-bbb9-429d-a8ce-f1ffdf94211c"],
    LOCATION_COLORADO_RABIES: ["ada6205e-6ee8-4189-9cdb-4947cccd84f4"],
    LOCATION_HOKKAIDO: [
        "0e81a82e-b409-41e9-9e3b-5f82e57f7a12",
        "c414a084-a7b9-43ce-b6ca-590620acd87e",
    ],
    LOCATION_HOKKAIDO_FLU: ["a2befcec-7799-4987-9215-6a152cb6a320"],
    LOCATION_NEWZEALAND: ["c65019e5-43a8-4a33-8a2a-84c750a5eeb3"],
    LOCATION_MIAMI: ["c1d015b4-be08-4e44-808e-ada0f387656f"],
    LOCATION_MIAMI_COTTONMOUTH: ["f1ba328f-e3dd-4ef8-bb26-0363499fdd95"],
    LOCATION_COLOMBIA: ["422519be-ed2e-44df-9dac-18f739d44fd9"],
    LOCATION_COLOMBIA_ANACONDA: ["179563a4-727a-4072-b354-c9fff4e8bff0"],
    LOCATION_MUMBAI: ["0fad48d7-3d0f-4c66-8605-6cbe9c3a46d7"],
    LOCATION_MUMBAI_KINGCOBRA: ["a8036782-de0a-4353-b522-0ab7a384bade"],
    LOCATION_NORTHAMERICA: ["82f55837-e26c-41bf-bc6e-fa97b7981fbc"],
    LOCATION_NORTHAMERICA_GARTERSNAKE: ["0b616e62-af0c-495b-82e3-b778e82b5912"],
    LOCATION_NORTHSEA: ["0d225edf-40cd-4f20-a30f-b62a373801d3"],
    LOCATION_GREEDY_RACCOON: ["7a03a97d-238c-48bd-bda0-e5f279569cce"],
    LOCATION_OPULENT_STINGRAY: ["095261b5-e15b-4ca1-9bb7-001fb85c5aaa"],
    LOCATION_GOLDEN_GECKO: ["7d85f2b0-80ca-49be-a2b7-d56f67faf252"],
    LOCATION_ANCESTRAL_BULLDOG: ["755984a8-fb0b-4673-8637-95cfe7d34e0f"],
    LOCATION_EDGY_FOX: ["ebcd14b2-0786-4ceb-a2a4-e771f60d0125"],
    LOCATION_WET_RAT: ["3d0cbb8c-2a80-442a-896b-fea00e98768c"],
    LOCATION_ELEGANT_LLAMA: ["d42f850f-ca55-4fc9-9766-8c6a2b5c3129"],
    LOCATION_TRAPPED_WOLVERINE: ["a3e19d55-64a6-4282-bb3c-d18c3f3e6e29"],
    LOCATION_ROCKY_DUGONG: ["b2aac100-dfc7-4f85-b9cd-528114436f6c"],
    LOCATION_SNUG: ["f8ec92c2-4fa2-471e-ae08-545480c746ee"],
    escalations: {
        LOCATION_ICA_FACILITY_SHIP: ["aee6a16f-6525-4d63-a37f-225e293c6118"],
        LOCATION_ICA_FACILITY: ["c469d91d-01fc-4314-b22c-71cb804e92c0"],
        LOCATION_PARIS: [
            "07bbf22b-d6ae-4883-bec2-122eeeb7b665",
            "4f6ee6ec-b6d7-4958-9838-0352c10294a0",
            "e6be23e8-8602-42c8-a014-17ffbfa053f5",
            "e01113e6-f27d-4ea1-a8ba-93062335bbf5",
            "0e5c23b1-4678-458b-ad98-8b55c268e90a",
            "c1db299f-3037-4726-b9fc-5cd951c45812",
            "bfb0d544-b4c9-4533-bed4-4562a43a3f40",
            "51038604-c3f4-41e9-889b-25d9d5de93c6",
            "162e9039-cb05-418c-ba8f-792fc6cc5165",
            "e75663c8-afca-45a1-af18-25fe3e663848",
            "ebf8e5b5-3bf0-487e-8d1b-9473aee61291",
            "39f03892-a841-4775-91ac-f8c91b485505",
            "54e6c794-2855-4ecf-acc2-d7710d5d96d1",
            "a1e7fdb4-88a4-4dbd-9ef2-d9bd1762cec2",
            "2e365b7c-817d-4213-8fb1-496fa8067e7b",
            "edeca4db-7394-4e93-9b6d-00581f16d6c1",
            "5746f21e-efa1-4787-a9ca-99a5f233f507",
            "77c7b56f-2410-4919-a4bc-64435c6cff55",
            "d6961637-effe-4c39-b99a-f2df4402657d",
            "ced3ecb8-70ab-40b0-b033-6f6235c61900",
        ],
        LOCATION_COASTALTOWN: [
            "9e0188e8-bdad-476c-b4ce-2faa5d2be56c",
            "74415eca-d01e-4070-9bc9-5ef9b4e8f7d2",
            "4b6739eb-bcdb-48ad-8c45-a829794175e1",
            "5a8bdb42-b11e-47d1-bc57-b4bf7efa9eda",
            "641656f8-ab16-49c5-a09b-952738154b64",
            "ee7e831b-f7ea-4803-8eba-80b42d020a7c",
            "95bb86f8-fbbf-4eb0-b2fa-bd379c0a4878",
            "0c4c6ce2-09d5-4fff-a946-099ced0558ea",
            "d43600cd-1128-4d59-bf87-075c73ae9776",
            "3d9dcf91-1708-4e22-88b3-41d184bcc8c3",
            "525bd318-04e6-4672-9d01-6bba74362fc5",
            "994540ee-3900-4a41-9544-17b2196a4b1a",
            "fab808f9-e88b-4775-aadb-a462c86bf2d9",
            "f08934c0-73f3-460c-a612-231035131c96",
        ],
        LOCATION_COASTALTOWN_MOVIESET: ["74739eda-6ed5-4318-a501-2fa0bd53ef5a"],
        LOCATION_COASTALTOWN_NIGHT: ["8dec1e62-bbf9-438c-8495-24559c884466"],
        LOCATION_COASTALTOWN_EBOLA: ["0cceeecb-c8fe-42a4-aee4-d7b575f56a1b"],
        LOCATION_MARRAKECH: [
            "19660896-fc1f-49f9-b56b-2059137530e4",
            "11c93649-6b00-46ac-bf2d-a3599a6ab3a9",
            "ebf8ab97-6ff3-4063-9737-c6f237031de7",
            "c67a1ead-7489-4d88-bbd2-c68d735e5df0",
            "896233eb-e7c5-4915-bf2b-5867799d8bb4",
            "45e6d255-f8e4-4170-ad7e-3416ab8a881d",
            "c949817b-5212-42e8-9b06-9a2eb83de167",
            "e359075e-a510-4b7c-a461-477b789ca7e4",
        ],
        LOCATION_MARRAKECH_NIGHT: [
            "b49de2a1-fe8e-49c4-8331-17aaa9d65d32",
            "c2e16fb7-d49f-49ef-9d76-46b8b31b3389",
        ],
        LOCATION_BANGKOK: [
            "f425e64f-99df-4ebf-9f7d-909a65a26aef",
            "ccbde3e2-67e7-4534-95ec-e9bd7ef65273",
            "1f785def-03b7-4340-af7e-2f5831e77eb5",
            "45c831c4-b455-4d21-90f3-6f09b28ee01b",
        ],
        LOCATION_BANGKOK_ZIKA: [],
        LOCATION_COLORADO: [
            "e6f4d3a4-9a33-4bd9-b761-da297069cf8c",
            "c5d88e8c-437b-476b-afe2-d94aa4293502",
            "4186dd23-1cfc-4ba0-9863-9f19f7cba249",
        ],
        LOCATION_COLORADO_RABIES: [],
        LOCATION_HOKKAIDO: [
            "115425b1-e797-47bf-b517-410dc7507397",
            "e96fb040-a13f-466c-9d96-c8f3b2b8a09a",
            "a1e5f4f4-ea9c-4a42-b826-50a212026d50",
            "85a2b618-2e3c-444f-931c-b89d566e45f7",
            "88451dd9-4b57-441e-9eab-e20b9879bafa",
        ],
        LOCATION_HOKKAIDO_FLU: [],
        LOCATION_NEWZEALAND: ["3efc73f9-33f0-4af6-9508-7208e6851394"],
        LOCATION_MIAMI: [
            "719ee044-4b05-4bd9-b2bb-75029f6d2a35",
            "5284cb9f-9bdd-4b00-99c3-0b5939b01818",
            "d0f44e71-6eab-4af4-9484-78d61dbe376a",
            "fca539ff-1b1a-4c04-93e0-03b9b902f86c",
            "782a2849-14a2-4cd4-99fc-ddacaeaba2dd",
            "be3ea01f-ec56-4fcb-95ec-164a1d9980f3",
            "066ce378-0418-452a-b02e-a5e4ee711096",
        ],
        LOCATION_COLOMBIA: [
            "390ba7b6-de27-464a-b8af-6d0ff54c2aec",
            "70150cd2-ef76-4ba8-80cc-b1e63871b030",
            "be567ad3-23f4-4d0b-9d2e-b261ea845ef0",
            "a5e81878-0eae-4bcf-af9b-9a7e7833f85d",
            "757fd132-0300-45ec-b5bd-bdd48c543b5c",
            "41ecf8ce-dfd4-4c08-8f44-52dedc3f089a",
            "d336d894-024a-4cd4-9867-dee7de70ee79",
        ],
        LOCATION_MUMBAI: [
            "667f48a3-7f6b-486e-8f6b-2f782a5c4857",
            "9badee3e-0014-46b1-9ef6-edf8858ba038",
            "b6a6330a-301a-4e8e-a26f-0f3e0ea809b5",
            "4a62b328-dfe7-4956-ac0f-a3a8990fce26",
            "a10472e4-0eb3-451d-814d-38837dd0f407",
            "ae0bd6cd-7062-4336-8cb0-5fafad3d0f4f",
            "b47f34cb-6537-421c-8fc8-720a4a118540",
        ],
        LOCATION_NORTHAMERICA: [
            "218302a3-f682-46f9-9ffd-bb3e82487b7c",
            "d1b9250b-33f6-4712-831b-f33fa11ee4d8",
            "1d5dcf3e-9682-4e32-ac11-ad6586daa456",
            "74e6b561-ff1a-4742-9a7b-890b7818c796",
            "15b7ad4e-565a-4fdb-b669-c9a68176e665",
            "fe088a10-5dbf-460f-bbe2-6b55e7a66253",
        ],
        LOCATION_NORTHSEA: [
            "e63eeb62-29ef-428d-b003-ea043b1f11f9",
            "b66f151d-47a7-4681-a403-c48a46916224",
            "dbb0e22d-084b-4b57-8616-42290982fd90",
            "4fbfae2e-a5e7-4b79-b008-94f6cbcb13cb",
            "3721e543-b5e6-4af8-a4fc-c92e9a4453bd",
            "8c6daf5e-5974-4438-af20-71ff570c7ff3",
        ],
        LOCATION_GREEDY_RACCOON: [
            "9a461f89-86c5-44e4-998e-f2f66b496aa7",
            "55063d85-e84a-4c76-8bf7-e70fe2cab651",
        ],
        LOCATION_OPULENT_STINGRAY: [
            "f19f7ac8-39ec-498b-aa23-44c8e75d8693",
            "35f1f534-ae2d-42be-8472-dd55e96625ea",
            "83d4e87e-2f47-4c81-b831-30bd13a29b05",
        ],
        LOCATION_GOLDEN_GECKO: [
            "8885eeda-ad64-44fa-a944-1438b36c670c",
            "ae04c7a0-4028-4524-b27f-6a62f020fdca",
            "9448d91d-f7df-4b5a-8ea3-91f1233f644a",
            "89305766-199e-43eb-9fcb-29e6f2b6e9ab",
            "a9dc4bf9-d277-4115-8dac-6c665cd68168",
        ],
        LOCATION_ANCESTRAL_BULLDOG: [
            "78628e05-93ce-4f87-8a17-b910d32df51f",
            "8e95dcd0-704f-4121-8be6-088a3812f838",
            "a838c4b0-7db5-4ac7-8d52-e8c5b82aa376",
            "b12d08ea-c842-498a-82ea-889653588592",
            "4689ef5e-0ddd-44b3-adca-aebf3293d9e1",
        ],
        LOCATION_ANCESTRAL_SMOOTHSNAKE: [
            "5680108a-19dc-4448-9344-3d0290217162",
        ],
        LOCATION_EDGY_FOX: [
            "ccdc7043-62af-44e8-a5fc-38b008c2044e",
            "9d88605f-6871-46a8-bd46-9804ea04fca9",
            "12d83cb0-a2d6-4c01-b9d8-675ac635ee61",
            "e3b65e65-636b-4dfd-bb42-65a18c5dce4a",
            "079876de-ddd7-47aa-8719-abe97d82fc12",
            "5bb29a6b-7384-4641-944c-3540fa5cd8aa",
        ],
        LOCATION_WET_RAT: [
            "07ffa72a-bbac-45ca-8c9f-b9c1b526153a",
            "5121acde-313d-4517-ae70-6a54ca5d775a",
            "494d97a6-9e31-45e0-9dae-f3793c731336",
            "542108f2-f82f-4a04-bfec-efa92785fec1",
            "84bf03cc-3055-4fd4-a691-d8b0ac61a51f",
        ],
        LOCATION_ELEGANT_LLAMA: [
            "1e4423b7-d4ff-448f-a8a8-4bb600cab7e3",
            "edbacf4b-e402-4548-b723-cd4351571537",
            "8c8ed496-948f-4672-879b-4d9575406577",
            "14a21819-f81f-453d-8734-a3aab528fa62",
            "72aaaa7b-4386-4ee7-9e9e-73fb8ff8e416",
        ],
        LOCATION_TRAPPED_WOLVERINE: ["078a50d1-6427-4fc3-9099-e46390e637a0"],
    },
    arcade: {
        LOCATION_NORTHSEA: [
            "b9f55fc3-c53f-4661-a4b6-9956303422aa",
            "6de90688-ad4c-457e-ae25-c4bbc8f55196",
            "07bc9bbf-7cba-4cdf-92bb-3ab57f09b1cc",
            "09a40d33-4820-454b-89af-a10e0b8d3e08",
            "74278853-5990-4058-8972-1f10ad12b6d8",
        ],
        LOCATION_COLOMBIA: ["90121ee0-0431-4a97-9bc8-8a7e2ca30d65"],
        LOCATION_ANCESTRAL_BULLDOG: [
            "bfb56fe6-06db-440a-aafe-42eeeb223fa1",
            "80cf04de-8e0b-4f38-b094-600753e2ac24",
            "85a67f31-75ce-40f5-a281-7765791f58ca",
        ],
        LOCATION_EDGY_FOX: [
            "d21e2e91-602c-49d2-9d42-e8bcfb810e9a",
            "be787ec9-e7b9-4984-bb39-fda4c71705ec",
            "e4b29c19-13b4-471b-b188-cd9c0a788cd0",
        ],
        LOCATION_PARIS: [
            "7886bed7-3805-46c6-a792-4a0d55758934",
            "06f99231-9b1e-483f-8a72-f91efcc2fd2b",
            "6516174c-abe0-4cd7-acdb-7cda4c9b5016",
            "223aa1f3-64a1-43c0-b3c8-36aebd7998e4",
            "7569d5e4-5270-4b69-96c8-e47b99876390",
            "479ec396-b96f-4e01-94d9-aedaa0582ed9",
            "09ea9b32-dc85-4633-9f6a-c5c4bfded5ac",
        ],
        LOCATION_ELEGANT_LLAMA: [
            "17027c6f-7010-43b8-bb42-1a6846fc0b7b",
            "a79640cb-331a-41af-abaf-58e629fe0a04",
            "2c2afdfe-d396-451a-a6a3-52aca4ea4f1f",
            "afb4ce18-bf9d-443d-85a8-207df9011792",
        ],
        LOCATION_COLORADO: [
            "ff5b4e53-49ea-4d85-b94e-d3c8b3fc7ab3",
            "b4d555eb-e2c9-40c2-b155-328a7019fd28",
        ],
        LOCATION_COASTALTOWN: [
            "8db8fa33-cb41-4a0d-a2de-e30d884afb95",
            "9e469023-e0c4-42bf-8527-f9fcaf624421",
        ],
        LOCATION_NEWZEALAND: ["39cc0603-4348-4dbf-9bd3-733cadf2913c"],
        LOCATION_NORTHAMERICA: [
            "5081776a-86b6-4935-a83e-631a65ba8ee8",
            "cab4293f-e359-419d-aa6f-83d91a158cf5",
        ],
        LOCATION_WET_RAT: [
            "dd68d30f-3900-415f-bb17-84681a2cd4fc",
            "9cbdb972-95df-4e0a-be77-7937ec6f2fb0",
        ],
    },
    sniper: {
        LOCATION_AUSTRIA: ["ff9f46cf-00bd-4c12-b887-eac491c3a96d"],
        LOCATION_SALTY_SEAGULL: ["00e57709-e049-44c9-a2c3-7655e19884fb"],
        LOCATION_CAGED_FALCON: ["25b20d86-bb5a-4ebd-b6bb-81ed2779c180"],
    },
    elusive: {},
    sarajevo: {},
    /**
     * Special property for pro mode missions (2016 exclusive).
     * Mapping of location parent to pro mode contract ID, instead of the typical mission array.
     */
    pro1: {
        LOCATION_PARENT_PARIS: "5ee4d771-6ab3-41fa-ab4f-04970d0ca327",
        LOCATION_PARENT_COASTALTOWN: "644d36bd-1f88-44f9-9fed-14a51e5e3f6b",
        LOCATION_PARENT_MARRAKECH: "7b2d5500-7853-4ad0-b68a-14be791cfba2",
        LOCATION_PARENT_BANGKOK: "ad5f9051-045d-4b8e-8a4d-d84429f467f8",
        LOCATION_PARENT_COLORADO: "69b58abc-6535-4092-9afe-c046b26303e6",
        LOCATION_PARENT_HOKKAIDO: "3d885714-fa9a-4438-9e0f-c58dbcaab8b8",
    },
}
