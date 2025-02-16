import { createRootRoute, Link, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/router-devtools"
import { ArchipelagoContextProvider } from "~/context/ArchipelagoContext"
import { MessagesContextProvider } from "~/context/MessagesContext"

export const Route = createRootRoute({
    component: () => (
        <>
            <div className="p-2 flex gap-2">
                <Link to="/" className="[&.active]:font-bold">
                    Home
                </Link>
                <Link to="/chat" className="[&.active]:font-bold">
                    Messages
                </Link>
            </div>
            <hr />

            <ArchipelagoContextProvider>
                <MessagesContextProvider>
                    <Outlet />
                </MessagesContextProvider>
            </ArchipelagoContextProvider>
            <TanStackRouterDevtools />
        </>
    ),
})
