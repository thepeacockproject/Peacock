import { Controller } from "@peacockproject/core/controller"
import { LogLevel, log } from "@peacockproject/core/loggingInterop"
import { orderedETs } from "@peacockproject/core/contracts/elusiveTargets"
import { FlagSection } from "@peacockproject/core/types/types"
import { getFlag, registerFlagSection } from "@peacockproject/core/flags"

const pluginFlagSectionKey = "elusiveDestinations"
const pluginFlagSection: FlagSection = {
    title: "Plugin - Elusive Destinations",
    desc: "Add elusive targets to Destinations",
    flags: {
        allDifficulties: {
            title: "All difficulties",
            desc: "When turned on, elusive targets can be played on any difficulty.",
            default: true,
            requiresPeacockRestart: true,
        },
        allEntrances: {
            title: "All entrances",
            desc: "When turned on, any starting location can be chosen for elusive targets, regardless of unlock status.",
            default: true,
            requiresPeacockRestart: true,
        },
        smallTiles: {
            title: "Small tiles",
            desc: "When turned on, show elusive targets as small tiles under Destinations.",
            default: true,
            requiresPeacockRestart: true,
        },
        smallTiles1: {
            title: "Small tiles",
            desc: "When turned on, show elusive targets as small tiles under Destinations.",
            category: "Test category",
            default: true,
            requiresPeacockRestart: true,
        },
        test1: {
            title: "Test 1",
            desc: "This is a test",
            default: "1",
            possibleValues: ["1", "2", "3"],
        },
        test2: {
            title: "Test 2",
            category: "Test category",
            desc: "This is a test",
            default: "1",
            possibleValues: ["1", "2", "3"],
        },
    },
}

function initPlugin(controller: Controller): void {
    log(LogLevel.INFO, "[Plugin] Elusive destinations", "elusive-destinations")

    registerFlagSection(pluginFlagSectionKey, pluginFlagSection)

    for (const contractId of orderedETs) {
        const contract = controller.resolveContract(contractId, undefined!)

        if (!contract) {
            continue
        }

        const baseContractId =
            // @ts-expect-error Indexer
            controller.missionsInLocations[contract.Metadata.Location][0]
        const baseContract = controller.resolveContract(
            baseContractId,
            undefined!,
        )

        if (!baseContract) {
            continue
        }

        if (getFlag(`${pluginFlagSectionKey}.allDifficulties`)) {
            contract.Data.GameDifficulties = baseContract.Data.GameDifficulties
        }

        if (getFlag(`${pluginFlagSectionKey}.allEntrances`)) {
            contract.Data.Entrances = baseContract.Data.Entrances
        }

        if (getFlag(`${pluginFlagSectionKey}.smallTiles`)) {
            contract.Metadata.Subtype = "specialassignment"
        }

        controller.addMission(contract)

        // @ts-expect-error Indexer
        controller.missionsInLocations[contract.Metadata.Location].push(
            contract.Metadata.Id,
        )
    }
}

module.exports = initPlugin
