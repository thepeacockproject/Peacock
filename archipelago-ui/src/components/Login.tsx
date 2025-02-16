import { useCallback, useState } from "react"

export default function Login() {
    const [address, setAddress] = useState("")
    const [name, setName] = useState("")
    const [password, setPassword] = useState("")

    const login = useCallback(async () => {
        try {
            const response = await fetch("./api/connect", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    url: address,
                    name: name,
                    password: password ?? undefined,
                }),
            })
            const data = await response.json()
            console.log(data)
        } catch (error) {
            console.error(error)
        }
    }, [address, name, password])

    return (
        <div className="flex flex-col">
            <span>Login</span>
            <div>
                <span>Address:</span>
                <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                />
            </div>
            <div>
                <span>Name:</span>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </div>
            <div>
                <span>Password:</span>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>
            <button onClick={() => void login()}>Login</button>
        </div>
    )
}
