import { LogLevel, log } from "../loggingInterop"
import { Client } from "archipelago.js"

let client: Client

export function getArchipelagoClient() {
    if (client) {
        return client
    }

    log(LogLevel.DEBUG, "Creating new Archipelago client")
    client = new Client()
    return client
}
