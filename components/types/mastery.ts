import { CompletionData, Unlockable } from "./types"

export interface MasteryDataTemplate {
    template: unknown
    data: {
        Location: Unlockable
        MasteryData: MasteryData[]
    }
}

export interface MasteryPackage {
    Id: string
    MaxLevel?: number
    HideProgression?: boolean
    Drops: {
        Id: string
        Level: number
    }[]
}

export interface MasteryData {
    CompletionData: CompletionData
    Drops: MasteryDrop[]
}

export interface MasteryDrop {
    IsLevelMarker: boolean
    Unlockable: Unlockable
    Level: number
    IsLocked: boolean
    TypeLocaKey: string
}
