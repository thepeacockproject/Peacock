import { SyncBailHook } from "./hooksImpl"
import { log, LogLevel } from "./loggingInterop"
import { nilUuid } from "./utils"

const peacockCommandPrefix = "peacock:"

// LennardF1989: Do we want to consider string[] because of the use of URLSearchParams?
type CommandArgs = {
    [key: string]: string /* | string[] */
}

type CommandResponseCache = {
    [key: string]: unknown
}

type CommandStatus = {
    CacheBuster: string
    Commands: CommandResponseCache
    IsConfirmed: boolean
    LinkedEmail: string
    IOIAccountId: string
    IOIAccountBaseUrl: string
}

export type CommandFunction = (
    lastResponse: unknown | undefined,
    args: unknown,
) => unknown

/* export */ class CommandService {
    public handleCommand: SyncBailHook<
        [
            /** lastResponse */ unknown,
            /** command */ string,
            /** args */ unknown,
        ],
        unknown
    >

    private commandResponseCache: CommandResponseCache

    constructor() {
        this.handleCommand = new SyncBailHook()
        this.commandResponseCache = {}
    }

    public getCommandStatus(): CommandStatus {
        return {
            CacheBuster: Date.now().toString(),
            Commands: this.commandResponseCache,
            IsConfirmed: true,
            LinkedEmail: "mail@example.com",
            IOIAccountId: nilUuid,
            IOIAccountBaseUrl: "https://account.ioi.dk",
        }
    }

    public submitCommands(email: string): CommandStatus {
        if (!email.startsWith(peacockCommandPrefix)) {
            return this.getCommandStatus()
        }

        try {
            const commands = email
                .substring(peacockCommandPrefix.length)
                .split("|")

            commands.forEach((c) => {
                const commandIndex = c.indexOf("?")

                let command = undefined
                let args: CommandArgs

                if (commandIndex < 0) {
                    command = c
                    args = {}
                } else {
                    command = c.substring(0, commandIndex)
                    args = Object.fromEntries(
                        new URLSearchParams(c.substring(commandIndex + 1)),
                    )
                }

                if (command === "clear") {
                    const commands = (args.commands as string)?.split(",")

                    for (const c of commands) {
                        this.commandResponseCache[c] = undefined
                    }
                } else {
                    this.commandResponseCache[command] =
                        this.handleCommand.call(
                            this.commandResponseCache[command],
                            command,
                            args,
                        )
                }

                // logDebug(command, args, this.commandResponseCache)
            })
        } catch (e) {
            log(LogLevel.ERROR, `Failed to handle Peacock command: ${e}`)
        }

        return this.getCommandStatus()
    }

    public handleCommandMap(
        name: string,
        commandMap: Map<string, CommandFunction>,
    ) {
        this.handleCommand.tap(
            name,
            (
                lastResponse: unknown,
                command: string,
                args: unknown,
            ): unknown => {
                if (commandMap.has(command)) {
                    return commandMap.get(command)!(lastResponse, args)
                }

                return undefined
            },
        )
    }
}

export const commandService = new CommandService()
