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

import { LiveSplitClient, LiveSplitResult } from "./liveSplitClient"
import { log, LogLevel } from "../loggingInterop"
import { getAllCampaigns } from "../menus/campaigns"
import { Campaign, GameVersion, IHit, Seconds, StoryData } from "../types/types"
import { getFlag } from "../flags"
import { controller } from "../controller"
import { scenePathToRpAsset } from "../discordRp"
import { LiveSplitTimeCalcEntry } from "../types/livesplit"

export class LiveSplitManager {
    private readonly _liveSplitClient: LiveSplitClient
    // https://youtrack.jetbrains.com/issue/WEB-54745
    // noinspection TypeScriptFieldCanBeMadeReadonly
    private _initialized: boolean
    private _initializationAttempted: boolean
    private _resetMinimum: Seconds
    private _currentCampaign: string[]
    private _inValidCampaignRun: boolean
    private _currentMission: string | undefined
    private _currentMissionTotalTime: number
    private _campaignTotalTime: number
    private _completedMissions: string[]
    private _timeCalcEntries: LiveSplitTimeCalcEntry[]
    private _raceMode: boolean | undefined // gets late-initialized, use _isRaceMode to access

    constructor() {
        this._initialized = false
        this._initializationAttempted = false
        this._resetMinimum = 1
        this._currentMission = undefined
        this._inValidCampaignRun = false
        this._completedMissions = []
        this._timeCalcEntries = []
        this._currentMissionTotalTime = 0
        this._campaignTotalTime = 0
        this._raceMode = undefined
        this._liveSplitClient = new LiveSplitClient("127.0.0.1:16834")
    }

    /*
     * PUBLIC INTERFACE
     */

    missionIntentResolved(contractId: string, startId: string): void {
        if (
            LiveSplitManager._isClub27(contractId) &&
            LiveSplitManager._isBangkokDefaultStartLocation(startId)
        ) {
            this._resetMinimum = 10
            return
        }

        this._resetMinimum = 0
    }

    async startMission(
        contractId: string,
        gameVersion: GameVersion,
        userId: string,
    ) {
        if (!this._checkInit()) {
            return
        }

        const campaign = getCampaignMissions(contractId, gameVersion, userId)

        if (campaign === undefined) {
            this._invalidateRun(contractId)
            return
        }

        this._currentCampaign = campaign

        const isStartOfCampaign =
            this._currentCampaign.indexOf(contractId) === 0

        if (isStartOfCampaign) {
            this._currentMission = contractId
            await this._resetCampaign()
            await this._pushGameTime()
            return
        }

        if (this._inValidCampaignRun) {
            const numComplete = this._completedMissions.length

            if (contractId === this._currentMission) {
                const lastCompleted = this._completedMissions[numComplete - 1]

                if (contractId === lastCompleted) {
                    // for whatever reason, previous mission completed but still resetting,
                    // un-split. total time is not reset on mission complete, so it should still be valid.
                    // do pop the completed mission though as we're entering a new attempt
                    this._completedMissions.pop()
                    this._unsplitLastTimeCalcEntry()

                    if (!this._isRaceMode) {
                        logLiveSplitError(
                            await this._liveSplitClient.unsplit(),
                            "unsplit",
                        )
                        logLiveSplitError(
                            await this._liveSplitClient.startTimer(),
                            "startTimer",
                        )
                        logLiveSplitError(
                            await this._liveSplitClient.pauseGameTime(),
                            "pauseGameTime",
                        )
                    }
                }

                await this._pushGameTime()

                // was a reset, don't need to do anything more
                return
            }

            // we've started a new mission

            // figure out what the current mission should be based on the active campaign and
            // the previous completed mission
            const nextCampaignMission = this._currentCampaign[numComplete]

            if (contractId === nextCampaignMission) {
                // if it does match, we're on a valid next mission so reset the state
                this._currentMission = contractId
                this._currentMissionTotalTime = 0
                await this._pushGameTime()

                if (!this._isRaceMode) {
                    logLiveSplitError(
                        await this._liveSplitClient.startTimer(),
                        "startTimer",
                    )
                    logLiveSplitError(
                        await this._liveSplitClient.pauseGameTime(),
                        "pauseGameTime",
                    )
                }
            } else {
                // if it doesn't match, invalidate the current run
                this._invalidateRun(contractId)
            }
        }
    }

    async failMission(attemptTime: Seconds) {
        if (!this._checkInit()) {
            return
        }

        if (this._inValidCampaignRun) {
            const computedTime = this._addMissionTime(attemptTime)
            this._addTimeCalcEntry(this._currentMission, computedTime, false)
            LiveSplitManager._logAttempt(computedTime)
            await this._pushGameTime()
        }
    }

    async completeMission(attemptTime: Seconds) {
        LiveSplitManager._logAttempt(attemptTime)

        if (!this._checkInit()) {
            return
        }

        if (this._inValidCampaignRun) {
            const computedTime = this._addMissionTime(attemptTime)
            this._addTimeCalcEntry(this._currentMission, computedTime, true)
            log(
                LogLevel.INFO,
                `Total mission time with resets: ${this._currentMissionTotalTime}`,
            )
            this._completedMissions.push(this._currentMission)
            await this._pushGameTime()

            if (this._isRaceMode) {
                if (
                    this._completedMissions.length ===
                    this._currentCampaign.length
                ) {
                    // Campaign is complete, racetimegg in livesplit uses first split as completion
                    logLiveSplitError(
                        await this._liveSplitClient.split(),
                        "split",
                    )
                    logLiveSplitError(
                        await this._liveSplitClient.pause(),
                        "pause",
                    )

                    const flooredTime = Math.floor(this._campaignTotalTime)
                    const minutes = Math.floor(flooredTime / 60)
                    const seconds = Math.floor(flooredTime % 60)

                    log(
                        LogLevel.INFO,
                        `Total campaign in-game time with resets: ${minutes}:${seconds}`,
                    )
                }
            } else {
                logLiveSplitError(await this._liveSplitClient.split(), "split")

                if (
                    this._completedMissions.length ===
                    this._currentCampaign.length
                ) {
                    // Pause real time timer because campaign is potentially complete
                    logLiveSplitError(
                        await this._liveSplitClient.pause(),
                        "pause",
                    )

                    log(
                        LogLevel.INFO,
                        `TimeCalc link(s):\n${this._generateTimeCalcLinks()}`,
                    )
                }
            }
            // purposely do not reset this._currentMissionTotalTime yet in case mission complete
            // but runner still wants to reset (could happen if lose SA at the end of a fast map like Dubai)
        }
    }

    /*
     * PRIVATE METHODS
     */

    async init() {
        if (!getFlag("liveSplit")) {
            this._initializationAttempted = true

            return
        }

        try {
            logLiveSplitError(await this._liveSplitClient.connect(), "connect")
            logLiveSplitError(
                await this._liveSplitClient.initGameTime(),
                "initGameTime",
            )
            logLiveSplitError(
                await this._liveSplitClient.pauseGameTime(),
                "pauseGameTime",
            )

            log(LogLevel.DEBUG, "LiveSplit initialized")
            this._initialized = true
            this._initializationAttempted = true
        } catch (e) {
            log(LogLevel.DEBUG, "Failed to initialize LiveSplit: ")
            log(LogLevel.DEBUG, e)
        }
    }

    private _checkInit(): boolean {
        if (!this._initializationAttempted) {
            log(
                LogLevel.ERROR,
                "Tried to perform LiveSplit action before LiveSplit initialization finished.",
            )
        }

        return this._initialized
    }

    private static _logAttempt(attemptTime: number): void {
        log(
            LogLevel.INFO,
            `Time (with milliseconds): ${Math.floor(
                attemptTime,
            )} (${attemptTime})`,
        )
    }

    private get _isRaceMode(): boolean {
        if (this._raceMode === undefined) {
            this._raceMode = getFlag("autoSplitterRacetimegg") === true
        }

        return this._raceMode as boolean
    }

    private async _invalidateRun(contractId: string) {
        log(
            LogLevel.INFO,
            "Entered invalid mission for current campaign state, invalidating autosplitter run. Start first mission of a campaign to reset and start a new run.",
        )
        const nextCampaignMission =
            this._currentCampaign[this._completedMissions.length]
        log(
            LogLevel.INFO,
            "Detected campaign missions: " + this._currentCampaign,
        )
        log(LogLevel.INFO, "Completed missions: " + this._completedMissions)
        log(
            LogLevel.INFO,
            "Next campaign mission detected: " + nextCampaignMission,
        )
        log(LogLevel.INFO, "Attempted to start mission: " + contractId)
        this._inValidCampaignRun = false

        // if we're in race mode, we don't pause the timer because the user can just manually complete the run if they need to
        // and verification will take care of the validity
        if (!this._isRaceMode) {
            logLiveSplitError(await this._liveSplitClient.pause(), "pause")
        }
    }

    private async _resetCampaign() {
        log(LogLevel.INFO, "Starting new autosplitter campaign.")
        log(
            LogLevel.INFO,
            `Detected campaign missions: ${this._currentCampaign}`,
        )
        this._completedMissions = []
        this._timeCalcEntries = []
        this._inValidCampaignRun = true
        this._currentMissionTotalTime = 0
        this._campaignTotalTime = 0

        // race mode does this automatically with racetimegg integration
        if (!this._isRaceMode) {
            logLiveSplitError(await this._liveSplitClient.reset(), "reset")
            logLiveSplitError(
                await this._liveSplitClient.startTimer(),
                "startTimer",
            )
            logLiveSplitError(
                await this._liveSplitClient.pauseGameTime(),
                "pauseGameTime",
            )
        }
    }

    private static _isClub27(contractId: string): boolean {
        return [
            "db341d9f-58a4-411d-be57-0bc4ed85646b",
            "ad5f9051-045d-4b8e-8a4d-d84429f467f8",
        ].includes(contractId)
    }

    private static _isBangkokDefaultStartLocation(
        startLocationId: string,
    ): boolean {
        return [
            "9ddbd515-2519-4c16-98aa-0f87af5d8ef5",
            // maybe more?
        ].includes(startLocationId)
    }

    private async _setGameTime(totalTime: Seconds) {
        // IMPORTANT to floor to int before sending to livesplit or else parsing will fail silently...
        const flooredTime = Math.floor(totalTime)
        const minutes = Math.floor(flooredTime / 60)
        const seconds = Math.floor(flooredTime % 60)

        logLiveSplitError(
            await this._liveSplitClient.pauseGameTime(),
            "pauseGameTime",
        )
        logLiveSplitError(
            await this._liveSplitClient.setGameTime(`${minutes}:${seconds}.00`),
            "setGameTime",
        )
    }

    private _addMissionTime(time: Seconds): Seconds {
        let computedTime = Math.floor(time)

        // always add at least minimum, which is usually 0 except on cutscenes where
        // you can gain an advantage by restarting in cs (bangkok, sgail specific starts)
        if (time <= this._resetMinimum) {
            computedTime = this._resetMinimum
        } else if (time > 0 && time <= 1) {
            // if in game time is between 0 and 1, add full second
            computedTime = 1
        }

        this._currentMissionTotalTime += computedTime
        this._campaignTotalTime += computedTime
        return computedTime
    }

    private async _pushGameTime() {
        if (!this._initialized) {
            return
        }

        await this._setGameTime(this._campaignTotalTime)
    }

    private _getMissionLocationName(contractId: string) {
        const contract = controller.resolveContract(contractId)
        const [, , location] = scenePathToRpAsset(
            contract.Metadata.ScenePath,
            contract.Data.Bricks,
        )
        return location
    }

    private _addTimeCalcEntry(
        contractId: string,
        time: Seconds,
        isCompleted: boolean,
    ) {
        const location = this._getMissionLocationName(contractId)
        const entry: LiveSplitTimeCalcEntry = {
            contractId,
            location,
            time,
            isCompleted,
        }
        this._timeCalcEntries.push(entry)
    }

    private _unsplitLastTimeCalcEntry() {
        const entry = this._timeCalcEntries.pop()
        entry.isCompleted = false
        this._timeCalcEntries.push(entry)
    }

    private _generateTimeCalcLinks() {
        const baseUrl =
            "https://solderq35.github.io/fg-time-calc/?mode=0&fs3=1&ft2=1&f3t1=1&f4t0=1&d=:&o1=1&fps="

        const links: string[] = []

        const searchParams = new URLSearchParams()

        const completedEntries = this._timeCalcEntries.filter(
            (e) => e.isCompleted,
        )
        const resetEntries = this._timeCalcEntries.filter((e) => !e.isCompleted)

        let timecalcLine = 0

        completedEntries.forEach((entry) => {
            timecalcLine += 1
            searchParams.set(
                `t${timecalcLine}`,
                `${this._formatSecondsToTime(entry.time)}`,
            )
            searchParams.set(`c${timecalcLine}`, entry.location)
        })

        const totalEntries = completedEntries.length + resetEntries.length

        if (totalEntries + 1 > 40) {
            // We need to make multiple TimeCalc links
            const completedEntriesLink = new URL(baseUrl)

            // Calculate combined reset time
            timecalcLine += 2
            searchParams.set(
                `t${timecalcLine}`,
                `${this._formatSecondsToTime(
                    resetEntries.reduce((total, entry) => {
                        return (total += Math.floor(entry.time))
                    }, 0),
                )}`,
            )
            searchParams.set(`c${timecalcLine}`, "Combined reset time")

            // Append new search
            completedEntriesLink.search +=
                "&" +
                searchParams
                    .toString()
                    .replaceAll("+", "%20")
                    .replaceAll("%3A", ":")
            links.push(completedEntriesLink.toString())

            timecalcLine = 0

            if (resetEntries.length > 40) {
                // TODO: We'll need more than 1 link for resets...
            }
        } else {
            timecalcLine += 1
        }

        let resetLocation = ""
        let resetCount = 0

        resetEntries.forEach((entry) => {
            timecalcLine += 1

            if (resetLocation === entry.location) {
                resetCount += 1
            } else {
                resetLocation = entry.location
                resetCount = 1
            }

            searchParams.set(
                `t${timecalcLine}`,
                `${this._formatSecondsToTime(entry.time)}`,
            )
            searchParams.set(
                `c${timecalcLine}`,
                `${entry.location} reset ${resetCount}`,
            )
        })
        const resetEntriesLink = new URL(baseUrl)
        // Append new search
        resetEntriesLink.search +=
            "&" +
            searchParams
                .toString()
                .replaceAll("+", "%20")
                .replaceAll("%3A", ":")
        links.push(resetEntriesLink.toString())

        return links.join("\n")
    }

    private _formatSecondsToTime(time: Seconds) {
        const flooredTime = Math.floor(time)
        if (flooredTime < 60) return flooredTime
        const minutes = Math.floor(flooredTime / 60)
        const seconds = Math.floor(flooredTime % 60)

        return `${minutes}:${seconds}`
    }
}

function logLiveSplitError(
    result: Awaited<LiveSplitResult>,
    failureCall: string,
) {
    if (!result) {
        log(
            LogLevel.ERROR,
            "LiveSplit Server internal error on: " + failureCall,
        )
    }
}

function getCampaignMissions(
    missionId: string,
    gameVersion: GameVersion,
    userId: string,
): string[] | undefined {
    // find the campaign this mission is in
    const allCampaigns = getAllCampaigns(gameVersion, userId)

    const findNamedCampaign = (name: string): Campaign | undefined => {
        return allCampaigns.find((campaign) => campaign.Name === name)
    }

    const campaignMissionIds = (campaignStoryData: StoryData[]): string[] => {
        return campaignStoryData
            .filter((data) => data.Type === "Mission")
            .map((sd) => (sd.Data as IHit).Id)
    }

    // the trilogy is the only place where multiple campaigns are merged together
    const trilogy: string[] = campaignMissionIds([
        ...(findNamedCampaign("UI_SEASON_1")?.StoryData ?? []),
        ...(findNamedCampaign("UI_SEASON_2")?.StoryData ?? []),
        ...(findNamedCampaign("UI_SEASON_3")?.StoryData ?? []),
    ])

    if (trilogy.indexOf(missionId) === -1) {
        // not in the trilogy, fall back to all campaigns
        return allCampaigns
            .map((c) => campaignMissionIds(c.StoryData ?? []))
            .find((mc) => mc.includes(missionId))
    } else {
        const campaignFlag = getFlag("autoSplitterCampaign") as string | number

        switch (campaignFlag) {
            case 1:
                return trilogy.slice(0, 6)
            case 2:
                return trilogy.slice(6, 14)
            case 3:
                return trilogy.slice(14, trilogy.length)
            default:
                return trilogy
        }
    }
}

export const liveSplitManager = new LiveSplitManager()
