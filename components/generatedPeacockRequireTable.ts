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

import * as webFeatures from "./webFeatures"
import * as utils from "./utils"
import * as tools from "./tools"
import * as sessionSerialization from "./sessionSerialization"
import * as scoreHandler from "./scoreHandler"
import * as profileHandler from "./profileHandler"
import * as platformEntitlements from "./platformEntitlements"
import * as ownership from "./ownership"
import * as officialServerAuth from "./officialServerAuth"
import * as oauthToken from "./oauthToken"
import * as menuData from "./menuData"
import * as loggingInterop from "./loggingInterop"
import * as loadouts from "./loadouts"
import * as inventory from "./inventory"
import * as hotReloadService from "./hotReloadService"
import * as hooksImpl from "./hooksImpl"
import * as flags from "./flags"
import * as evergreen from "./evergreen"
import * as eventHandler from "./eventHandler"
import * as entitlementStrategies from "./entitlementStrategies"
import * as discordRp from "./discordRp"
import * as databaseHandler from "./databaseHandler"
import * as controller from "./controller"
import * as configSwizzleManager from "./configSwizzleManager"
import * as types from "./types/types"
import * as sniperModules from "./types/sniperModules"
import * as scoring from "./types/scoring"
import * as score from "./types/score"
import * as mastery from "./types/mastery"
import * as livesplit from "./types/livesplit"
import * as gameSchemas from "./types/gameSchemas"
import * as events from "./types/events"
import * as challenges from "./types/challenges"
import * as contractCreation from "./statemachines/contractCreation"
import * as contextListeners from "./statemachines/contextListeners"
import * as multiplayerUtils from "./multiplayer/multiplayerUtils"
import * as multiplayerService from "./multiplayer/multiplayerService"
import * as multiplayerMenuData from "./multiplayer/multiplayerMenuData"
import * as sniper from "./menus/sniper"
import * as playnext from "./menus/playnext"
import * as planning from "./menus/planning"
import * as menuSystem from "./menus/menuSystem"
import * as imageHandler from "./menus/imageHandler"
import * as favoriteContracts from "./menus/favoriteContracts"
import * as destinations from "./menus/destinations"
import * as campaigns from "./menus/campaigns"
import * as liveSplitManager from "./livesplit/liveSplitManager"
import * as liveSplitClient from "./livesplit/liveSplitClient"
import * as ipc from "./discord/ipc"
import * as client from "./discord/client"
import * as reportRouting from "./contracts/reportRouting"
import * as missionsInLocation from "./contracts/missionsInLocation"
import * as hitsCategoryService from "./contracts/hitsCategoryService"
import * as elusiveTargets from "./contracts/elusiveTargets"
import * as elusiveTargetArcades from "./contracts/elusiveTargetArcades"
import * as dataGen from "./contracts/dataGen"
import * as contractsModeRouting from "./contracts/contractsModeRouting"
import * as contractRouting from "./contracts/contractRouting"
import * as escalationService from "./contracts/escalations/escalationService"
import * as progressionService from "./candle/progressionService"
import * as masteryService from "./candle/masteryService"
import * as challengeService from "./candle/challengeService"
import * as challengeHelpers from "./candle/challengeHelpers"
import * as legacyProfileRouter from "./2016/legacyProfileRouter"
import * as legacyMenuSystem from "./2016/legacyMenuSystem"
import * as legacyMenuData from "./2016/legacyMenuData"
import * as legacyEventRouter from "./2016/legacyEventRouter"
import * as legacyContractHandler from "./2016/legacyContractHandler"

export default {
    "@peacockproject/core/webFeatures": { __esModule: true, ...webFeatures },
    "@peacockproject/core/utils": { __esModule: true, ...utils },
    "@peacockproject/core/tools": { __esModule: true, ...tools },
    "@peacockproject/core/sessionSerialization": {
        __esModule: true,
        ...sessionSerialization,
    },
    "@peacockproject/core/scoreHandler": { __esModule: true, ...scoreHandler },
    "@peacockproject/core/profileHandler": {
        __esModule: true,
        ...profileHandler,
    },
    "@peacockproject/core/platformEntitlements": {
        __esModule: true,
        ...platformEntitlements,
    },
    "@peacockproject/core/ownership": { __esModule: true, ...ownership },
    "@peacockproject/core/officialServerAuth": {
        __esModule: true,
        ...officialServerAuth,
    },
    "@peacockproject/core/oauthToken": { __esModule: true, ...oauthToken },
    "@peacockproject/core/menuData": { __esModule: true, ...menuData },
    "@peacockproject/core/loggingInterop": {
        __esModule: true,
        ...loggingInterop,
    },
    "@peacockproject/core/loadouts": { __esModule: true, ...loadouts },
    "@peacockproject/core/inventory": { __esModule: true, ...inventory },
    "@peacockproject/core/hotReloadService": {
        __esModule: true,
        ...hotReloadService,
    },
    "@peacockproject/core/hooksImpl": { __esModule: true, ...hooksImpl },
    "@peacockproject/core/flags": { __esModule: true, ...flags },
    "@peacockproject/core/evergreen": { __esModule: true, ...evergreen },
    "@peacockproject/core/eventHandler": { __esModule: true, ...eventHandler },
    "@peacockproject/core/entitlementStrategies": {
        __esModule: true,
        ...entitlementStrategies,
    },
    "@peacockproject/core/discordRp": { __esModule: true, ...discordRp },
    "@peacockproject/core/databaseHandler": {
        __esModule: true,
        ...databaseHandler,
    },
    "@peacockproject/core/controller": { __esModule: true, ...controller },
    "@peacockproject/core/configSwizzleManager": {
        __esModule: true,
        ...configSwizzleManager,
    },
    "@peacockproject/core/types/types": { __esModule: true, ...types },
    "@peacockproject/core/types/sniperModules": {
        __esModule: true,
        ...sniperModules,
    },
    "@peacockproject/core/types/scoring": { __esModule: true, ...scoring },
    "@peacockproject/core/types/score": { __esModule: true, ...score },
    "@peacockproject/core/types/mastery": { __esModule: true, ...mastery },
    "@peacockproject/core/types/livesplit": { __esModule: true, ...livesplit },
    "@peacockproject/core/types/gameSchemas": {
        __esModule: true,
        ...gameSchemas,
    },
    "@peacockproject/core/types/events": { __esModule: true, ...events },
    "@peacockproject/core/types/challenges": {
        __esModule: true,
        ...challenges,
    },
    "@peacockproject/core/statemachines/contractCreation": {
        __esModule: true,
        ...contractCreation,
    },
    "@peacockproject/core/statemachines/contextListeners": {
        __esModule: true,
        ...contextListeners,
    },
    "@peacockproject/core/multiplayer/multiplayerUtils": {
        __esModule: true,
        ...multiplayerUtils,
    },
    "@peacockproject/core/multiplayer/multiplayerService": {
        __esModule: true,
        ...multiplayerService,
    },
    "@peacockproject/core/multiplayer/multiplayerMenuData": {
        __esModule: true,
        ...multiplayerMenuData,
    },
    "@peacockproject/core/menus/sniper": { __esModule: true, ...sniper },
    "@peacockproject/core/menus/playnext": { __esModule: true, ...playnext },
    "@peacockproject/core/menus/planning": { __esModule: true, ...planning },
    "@peacockproject/core/menus/menuSystem": {
        __esModule: true,
        ...menuSystem,
    },
    "@peacockproject/core/menus/imageHandler": {
        __esModule: true,
        ...imageHandler,
    },
    "@peacockproject/core/menus/favoriteContracts": {
        __esModule: true,
        ...favoriteContracts,
    },
    "@peacockproject/core/menus/destinations": {
        __esModule: true,
        ...destinations,
    },
    "@peacockproject/core/menus/campaigns": { __esModule: true, ...campaigns },
    "@peacockproject/core/livesplit/liveSplitManager": {
        __esModule: true,
        ...liveSplitManager,
    },
    "@peacockproject/core/livesplit/liveSplitClient": {
        __esModule: true,
        ...liveSplitClient,
    },
    "@peacockproject/core/discord/ipc": { __esModule: true, ...ipc },
    "@peacockproject/core/discord/client": { __esModule: true, ...client },
    "@peacockproject/core/contracts/reportRouting": {
        __esModule: true,
        ...reportRouting,
    },
    "@peacockproject/core/contracts/missionsInLocation": {
        __esModule: true,
        ...missionsInLocation,
    },
    "@peacockproject/core/contracts/hitsCategoryService": {
        __esModule: true,
        ...hitsCategoryService,
    },
    "@peacockproject/core/contracts/elusiveTargets": {
        __esModule: true,
        ...elusiveTargets,
    },
    "@peacockproject/core/contracts/elusiveTargetArcades": {
        __esModule: true,
        ...elusiveTargetArcades,
    },
    "@peacockproject/core/contracts/dataGen": { __esModule: true, ...dataGen },
    "@peacockproject/core/contracts/contractsModeRouting": {
        __esModule: true,
        ...contractsModeRouting,
    },
    "@peacockproject/core/contracts/contractRouting": {
        __esModule: true,
        ...contractRouting,
    },
    "@peacockproject/core/contracts/escalations/escalationService": {
        __esModule: true,
        ...escalationService,
    },
    "@peacockproject/core/candle/progressionService": {
        __esModule: true,
        ...progressionService,
    },
    "@peacockproject/core/candle/masteryService": {
        __esModule: true,
        ...masteryService,
    },
    "@peacockproject/core/candle/challengeService": {
        __esModule: true,
        ...challengeService,
    },
    "@peacockproject/core/candle/challengeHelpers": {
        __esModule: true,
        ...challengeHelpers,
    },
    "@peacockproject/core/2016/legacyProfileRouter": {
        __esModule: true,
        ...legacyProfileRouter,
    },
    "@peacockproject/core/2016/legacyMenuSystem": {
        __esModule: true,
        ...legacyMenuSystem,
    },
    "@peacockproject/core/2016/legacyMenuData": {
        __esModule: true,
        ...legacyMenuData,
    },
    "@peacockproject/core/2016/legacyEventRouter": {
        __esModule: true,
        ...legacyEventRouter,
    },
    "@peacockproject/core/2016/legacyContractHandler": {
        __esModule: true,
        ...legacyContractHandler,
    },
}
