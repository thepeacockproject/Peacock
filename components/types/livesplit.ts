/**
 * LiveSplit-related types
 */

import { Seconds } from "./types"

export interface LiveSplitTimeCalcEntry {
    contractId: string
    time: Seconds
    location: string
    isCompleted: boolean
}
