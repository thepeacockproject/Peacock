import { useMessages } from "~/context/MessagesContext"

export default function MessageBox() {
    const { messages, listening } = useMessages()
    return (
        <div>
            <h1>Messages</h1>
            {listening ? (
                <div>
                    <ul>
                        {messages.map((message, index) => (
                            <li key={index}>{message}</li>
                        ))}
                    </ul>
                </div>
            ) : (
                <p>Not connected to Archipelago</p>
            )}
        </div>
    )
}
