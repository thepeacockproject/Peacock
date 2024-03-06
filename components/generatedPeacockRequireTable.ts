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

import * as configSwizzleManager from "./configSwizzleManager"
import * as controller from "./controller"
import * as databaseHandler from "./databaseHandler"
import * as discordRp from "./discordRp"
import * as entitlementStrategies from "./entitlementStrategies"
import * as eventHandler from "./eventHandler"
import * as evergreen from "./evergreen"
import * as flags from "./flags"
import * as hooksImpl from "./hooksImpl"
import * as hotReloadService from "./hotReloadService"
import * as inventory from "./inventory"
import * as loadouts from "./loadouts"
import * as loggingInterop from "./loggingInterop"
import * as menuData from "./menuData"
import * as oauthToken from "./oauthToken"
import * as officialServerAuth from "./officialServerAuth"
import * as ownership from "./ownership"
import * as platformEntitlements from "./platformEntitlements"
import * as playStyles from "./playStyles"
import * as profileHandler from "./profileHandler"
import * as scoreHandler from "./scoreHandler"
import * as smfSupport from "./smfSupport"
import * as utils from "./utils"
import * as webFeatures from "./webFeatures"
import * as legacyContractHandler from "./2016/legacyContractHandler"
import * as legacyMenuData from "./2016/legacyMenuData"
import * as legacyProfileRouter from "./2016/legacyProfileRouter"
import * as challengeHelpers from "./candle/challengeHelpers"
import * as challengeService from "./candle/challengeService"
import * as masteryService from "./candle/masteryService"
import * as progressionService from "./candle/progressionService"
import * as contractRouting from "./contracts/contractRouting"
import * as contractsModeRouting from "./contracts/contractsModeRouting"
import * as dataGen from "./contracts/dataGen"
import * as elusiveTargetArcades from "./contracts/elusiveTargetArcades"
import * as elusiveTargets from "./contracts/elusiveTargets"
import * as hitsCategoryService from "./contracts/hitsCategoryService"
import * as leaderboards from "./contracts/leaderboards"
import * as missionsInLocation from "./contracts/missionsInLocation"
import * as sessions from "./contracts/sessions"
import * as client from "./discord/client"
import * as ipc from "./discord/ipc"
import * as liveSplitClient from "./livesplit/liveSplitClient"
import * as liveSplitManager from "./livesplit/liveSplitManager"
import * as campaigns from "./menus/campaigns"
import * as destinations from "./menus/destinations"
import * as favoriteContracts from "./menus/favoriteContracts"
import * as hub from "./menus/hub"
import * as imageHandler from "./menus/imageHandler"
import * as menuSystem from "./menus/menuSystem"
import * as planning from "./menus/planning"
import * as playerProfile from "./menus/playerProfile"
import * as playnext from "./menus/playnext"
import * as sniper from "./menus/sniper"
import * as stashpoints from "./menus/stashpoints"
import * as multiplayerMenuData from "./multiplayer/multiplayerMenuData"
import * as multiplayerService from "./multiplayer/multiplayerService"
import * as multiplayerUtils from "./multiplayer/multiplayerUtils"
import * as contextListeners from "./statemachines/contextListeners"
import * as contractCreation from "./statemachines/contractCreation"
import * as escalationService from "./contracts/escalations/escalationService"

export default {
    "@peacockproject/core/configSwizzleManager": {
        __esModule: true,
        ...configSwizzleManager,
    },
    "@peacockproject/core/controller": { __esModule: true, ...controller },
    "@peacockproject/core/databaseHandler": {
        __esModule: true,
        ...databaseHandler,
    },
    "@peacockproject/core/discordRp": { __esModule: true, ...discordRp },
    "@peacockproject/core/entitlementStrategies": {
        __esModule: true,
        ...entitlementStrategies,
    },
    "@peacockproject/core/eventHandler": { __esModule: true, ...eventHandler },
    "@peacockproject/core/evergreen": { __esModule: true, ...evergreen },
    "@peacockproject/core/flags": { __esModule: true, ...flags },
    "@peacockproject/core/hooksImpl": { __esModule: true, ...hooksImpl },
    "@peacockproject/core/hotReloadService": {
        __esModule: true,
        ...hotReloadService,
    },
    "@peacockproject/core/inventory": { __esModule: true, ...inventory },
    "@peacockproject/core/loadouts": { __esModule: true, ...loadouts },
    "@peacockproject/core/loggingInterop": {
        __esModule: true,
        ...loggingInterop,
    },
    "@peacockproject/core/menuData": { __esModule: true, ...menuData },
    "@peacockproject/core/oauthToken": { __esModule: true, ...oauthToken },
    "@peacockproject/core/officialServerAuth": {
        __esModule: true,
        ...officialServerAuth,
    },
    "@peacockproject/core/ownership": { __esModule: true, ...ownership },
    "@peacockproject/core/platformEntitlements": {
        __esModule: true,
        ...platformEntitlements,
    },
    "@peacockproject/core/playStyles": { __esModule: true, ...playStyles },
    "@peacockproject/core/profileHandler": {
        __esModule: true,
        ...profileHandler,
    },
    "@peacockproject/core/scoreHandler": { __esModule: true, ...scoreHandler },
    "@peacockproject/core/smfSupport": { __esModule: true, ...smfSupport },
    "@peacockproject/core/utils": { __esModule: true, ...utils },
    "@peacockproject/core/webFeatures": { __esModule: true, ...webFeatures },
    "@peacockproject/core/2016/legacyContractHandler": {
        __esModule: true,
        ...legacyContractHandler,
    },
    "@peacockproject/core/2016/legacyMenuData": {
        __esModule: true,
        ...legacyMenuData,
    },
    "@peacockproject/core/2016/legacyProfileRouter": {
        __esModule: true,
        ...legacyProfileRouter,
    },
    "@peacockproject/core/candle/challengeHelpers": {
        __esModule: true,
        ...challengeHelpers,
    },
    "@peacockproject/core/candle/challengeService": {
        __esModule: true,
        ...challengeService,
    },
    "@peacockproject/core/candle/masteryService": {
        __esModule: true,
        ...masteryService,
    },
    "@peacockproject/core/candle/progressionService": {
        __esModule: true,
        ...progressionService,
    },
    "@peacockproject/core/contracts/contractRouting": {
        __esModule: true,
        ...contractRouting,
    },
    "@peacockproject/core/contracts/contractsModeRouting": {
        __esModule: true,
        ...contractsModeRouting,
    },
    "@peacockproject/core/contracts/dataGen": { __esModule: true, ...dataGen },
    "@peacockproject/core/contracts/elusiveTargetArcades": {
        __esModule: true,
        ...elusiveTargetArcades,
    },
    "@peacockproject/core/contracts/elusiveTargets": {
        __esModule: true,
        ...elusiveTargets,
    },
    "@peacockproject/core/contracts/hitsCategoryService": {
        __esModule: true,
        ...hitsCategoryService,
    },
    "@peacockproject/core/contracts/leaderboards": {
        __esModule: true,
        ...leaderboards,
    },
    "@peacockproject/core/contracts/missionsInLocation": {
        __esModule: true,
        ...missionsInLocation,
    },
    "@peacockproject/core/contracts/sessions": {
        __esModule: true,
        ...sessions,
    },
    "@peacockproject/core/discord/client": { __esModule: true, ...client },
    "@peacockproject/core/discord/ipc": { __esModule: true, ...ipc },
    "@peacockproject/core/livesplit/liveSplitClient": {
        __esModule: true,
        ...liveSplitClient,
    },
    "@peacockproject/core/livesplit/liveSplitManager": {
        __esModule: true,
        ...liveSplitManager,
    },
    "@peacockproject/core/menus/campaigns": { __esModule: true, ...campaigns },
    "@peacockproject/core/menus/destinations": {
        __esModule: true,
        ...destinations,
    },
    "@peacockproject/core/menus/favoriteContracts": {
        __esModule: true,
        ...favoriteContracts,
    },
    "@peacockproject/core/menus/hub": { __esModule: true, ...hub },
    "@peacockproject/core/menus/imageHandler": {
        __esModule: true,
        ...imageHandler,
    },
    "@peacockproject/core/menus/menuSystem": {
        __esModule: true,
        ...menuSystem,
    },
    "@peacockproject/core/menus/planning": { __esModule: true, ...planning },
    "@peacockproject/core/menus/playerProfile": {
        __esModule: true,
        ...playerProfile,
    },
    "@peacockproject/core/menus/playnext": { __esModule: true, ...playnext },
    "@peacockproject/core/menus/sniper": { __esModule: true, ...sniper },
    "@peacockproject/core/menus/stashpoints": {
        __esModule: true,
        ...stashpoints,
    },
    "@peacockproject/core/multiplayer/multiplayerMenuData": {
        __esModule: true,
        ...multiplayerMenuData,
    },
    "@peacockproject/core/multiplayer/multiplayerService": {
        __esModule: true,
        ...multiplayerService,
    },
    "@peacockproject/core/multiplayer/multiplayerUtils": {
        __esModule: true,
        ...multiplayerUtils,
    },
    "@peacockproject/core/statemachines/contextListeners": {
        __esModule: true,
        ...contextListeners,
    },
    "@peacockproject/core/statemachines/contractCreation": {
        __esModule: true,
        ...contractCreation,
    },
    "@peacockproject/core/contracts/escalations/escalationService": {
        __esModule: true,
        ...escalationService,
    },
}
