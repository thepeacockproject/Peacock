import { createContext, useContext, useEffect, useState } from "react"

export type MessagesContextType = {
    messages: string[]
    listening: boolean
    setMessages: (messages: string[]) => void
}

export const MessagesContext = createContext<MessagesContextType>({
    messages: [],
    listening: false,
    setMessages: () => {},
})

export const MessagesContextProvider = ({
    children,
}: {
    children: React.ReactNode
}) => {
    const [messages, setMessages] = useState<string[]>([])
    const [listening, setListening] = useState(false)

    useEffect(() => {
        const source = new EventSource("./api/messages-stream")

        source.onmessage = (event) => {
            const data: Record<string, unknown> = JSON.parse(event.data)

            if (data.ping) {
                console.log("Ping received")
                return
            }

            setMessages((prev) => [...prev, data.message as string])
        }

        source.onopen = () => {
            console.log("Connection opened")
            setListening(true)
        }

        source.onerror = (error) => {
            console.error("Error:", error)
            setListening(false)
        }

        return () => {
            source.close()
        }
    }, [])

    return (
        <MessagesContext.Provider
            value={{
                messages,
                listening,
                setMessages,
            }}
        >
            {children}
        </MessagesContext.Provider>
    )
}

export const useMessages = () => {
    const { messages, listening } = useContext(MessagesContext)
    return { messages, listening }
}
