import { createFileRoute } from "@tanstack/react-router"
import MessageBox from "~/components/MessageBox"

export const Route = createFileRoute("/chat")({
    component: Chat,
})

function Chat() {
    return (
        <main className="flex flex-col">
            <MessageBox />
        </main>
    )
}
