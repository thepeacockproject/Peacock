import { useArchipelago } from "~/context/ArchipelagoContext"

export default function Status() {
    const status = useArchipelago()

    return (
        <div className="flex flex-col">
            <span>Status</span>
            <div>
                <span>Address:</span>
                <span>{status.address}</span>
            </div>
            <div>
                <span>Name:</span>
                <span>{status.name}</span>
            </div>
            <div>
                <span>Game:</span>
                <span>{status.game}</span>
            </div>
            <div>
                <span>Authenticated:</span>
                <span>{status.authenticated ? "Yes" : "No"}</span>
            </div>
            <div>
                <span>Client Arguments:</span>
                <span>
                    {JSON.stringify(status.clientArguments, undefined, 4)}
                </span>
            </div>
        </div>
    )
}
