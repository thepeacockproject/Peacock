import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react"

export type ArchipelagoContextType = {
    address: string
    name: string
    game: string
    authenticated: boolean
    clientArguments: Record<string, unknown>
}

export const ArchipelagoContext = createContext<ArchipelagoContextType>({
    address: "",
    name: "",
    game: "",
    authenticated: false,
    clientArguments: {},
})

export const ArchipelagoContextProvider = ({
    children,
}: {
    children: React.ReactNode
}) => {
    const [address, setAddress] = useState("")
    const [name, setName] = useState("")
    const [game, setGame] = useState("")
    const [authenticated, setAuthenticated] = useState(false)
    const [clientArguments, setArguments] = useState<Record<string, unknown>>(
        {},
    )

    const getStatus = useCallback(async () => {
        const response = await fetch("./api/status", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        })

        try {
            const data = await response.json()
            setAddress(data.address)
            setName(data.name)
            setGame(data.game)
            setAuthenticated(data.authenticated)
            setArguments(data.arguments)
        } catch (error) {
            console.error(error)
        }
    }, [])

    useEffect(() => {
        getStatus()
    }, [getStatus])

    return (
        <ArchipelagoContext.Provider
            value={{
                address,
                name,
                game,
                authenticated,
                clientArguments,
            }}
        >
            {children}
        </ArchipelagoContext.Provider>
    )
}

export const useArchipelago = () => {
    const { address, name, game, authenticated, clientArguments } =
        useContext(ArchipelagoContext)
    return { address, name, game, authenticated, clientArguments }
}
