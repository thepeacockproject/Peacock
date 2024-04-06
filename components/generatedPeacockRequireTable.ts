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
import * as discordRp from "./discord/discordRp"
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
    "@peacockproject/core/configSwizzleManager": configSwizzleManager,
    "@peacockproject/core/controller": controller,
    "@peacockproject/core/databaseHandler": databaseHandler,
    "@peacockproject/core/entitlementStrategies": entitlementStrategies,
    "@peacockproject/core/eventHandler": eventHandler,
    "@peacockproject/core/evergreen": evergreen,
    "@peacockproject/core/flags": flags,
    "@peacockproject/core/hooksImpl": hooksImpl,
    "@peacockproject/core/hotReloadService": hotReloadService,
    "@peacockproject/core/inventory": inventory,
    "@peacockproject/core/loadouts": loadouts,
    "@peacockproject/core/loggingInterop": loggingInterop,
    "@peacockproject/core/menuData": menuData,
    "@peacockproject/core/oauthToken": oauthToken,
    "@peacockproject/core/officialServerAuth": officialServerAuth,
    "@peacockproject/core/ownership": ownership,
    "@peacockproject/core/platformEntitlements": platformEntitlements,
    "@peacockproject/core/playStyles": playStyles,
    "@peacockproject/core/profileHandler": profileHandler,
    "@peacockproject/core/scoreHandler": scoreHandler,
    "@peacockproject/core/smfSupport": smfSupport,
    "@peacockproject/core/utils": utils,
    "@peacockproject/core/webFeatures": webFeatures,
    "@peacockproject/core/2016/legacyContractHandler": legacyContractHandler,
    "@peacockproject/core/2016/legacyMenuData": legacyMenuData,
    "@peacockproject/core/2016/legacyProfileRouter": legacyProfileRouter,
    "@peacockproject/core/candle/challengeHelpers": challengeHelpers,
    "@peacockproject/core/candle/challengeService": challengeService,
    "@peacockproject/core/candle/masteryService": masteryService,
    "@peacockproject/core/candle/progressionService": progressionService,
    "@peacockproject/core/contracts/contractRouting": contractRouting,
    "@peacockproject/core/contracts/contractsModeRouting": contractsModeRouting,
    "@peacockproject/core/contracts/dataGen": dataGen,
    "@peacockproject/core/contracts/elusiveTargetArcades": elusiveTargetArcades,
    "@peacockproject/core/contracts/elusiveTargets": elusiveTargets,
    "@peacockproject/core/contracts/hitsCategoryService": hitsCategoryService,
    "@peacockproject/core/contracts/leaderboards": leaderboards,
    "@peacockproject/core/contracts/missionsInLocation": missionsInLocation,
    "@peacockproject/core/contracts/sessions": sessions,
    "@peacockproject/core/discord/client": client,
    "@peacockproject/core/discord/discordRp": discordRp,
    "@peacockproject/core/discord/ipc": ipc,
    "@peacockproject/core/livesplit/liveSplitClient": liveSplitClient,
    "@peacockproject/core/livesplit/liveSplitManager": liveSplitManager,
    "@peacockproject/core/menus/campaigns": campaigns,
    "@peacockproject/core/menus/destinations": destinations,
    "@peacockproject/core/menus/favoriteContracts": favoriteContracts,
    "@peacockproject/core/menus/hub": hub,
    "@peacockproject/core/menus/imageHandler": imageHandler,
    "@peacockproject/core/menus/menuSystem": menuSystem,
    "@peacockproject/core/menus/planning": planning,
    "@peacockproject/core/menus/playerProfile": playerProfile,
    "@peacockproject/core/menus/playnext": playnext,
    "@peacockproject/core/menus/sniper": sniper,
    "@peacockproject/core/menus/stashpoints": stashpoints,
    "@peacockproject/core/multiplayer/multiplayerMenuData": multiplayerMenuData,
    "@peacockproject/core/multiplayer/multiplayerService": multiplayerService,
    "@peacockproject/core/multiplayer/multiplayerUtils": multiplayerUtils,
    "@peacockproject/core/statemachines/contextListeners": contextListeners,
    "@peacockproject/core/statemachines/contractCreation": contractCreation,
    "@peacockproject/core/contracts/escalations/escalationService":
        escalationService,
}
