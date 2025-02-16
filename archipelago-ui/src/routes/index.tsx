import { createFileRoute } from "@tanstack/react-router"
import Login from "~/components/Login"
import Status from "~/components/Status"

export const Route = createFileRoute("/")({
    component: Index,
})

function Index() {
    return (
        <main className="flex flex-col">
            <p>Hello World!</p>
            <Login />
            <Status />
        </main>
    )
}
