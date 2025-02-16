import { type Controller } from "../controller"
import { LogLevel, log } from "../loggingInterop"
import { webFeaturesRouter } from "../webFeatures"

import { getArchipelagoClient } from "./archipelago"
import startServer from "./server"

const getAllChallenges = (controller: Controller) => {
    const allIds = controller.challengeService.getChallengeIds("h3")
    return allIds.map((id) =>
        controller.challengeService.getChallengeById(id, "h3"),
    )
}

export const loadArchipelago = (controller: Controller) => {
    getArchipelagoClient()
    const app = startServer()
    webFeaturesRouter.use("/archipelago", app)

    log(LogLevel.DEBUG, "Archipelago plugin loaded")
    log(
        LogLevel.INFO,
        "Archipelago plugin loaded, go to http://localhost:3000/_wf/archipelago",
    )

    const allChallenges = getAllChallenges(controller)

    log(LogLevel.DEBUG, allChallenges.length)
}
