import { createStore } from "zustand/vanilla";

export type ArchipelagoState = {
    address: string
    name: string
    password: string
}

const store = createStore<ArchipelagoState>()((set) => ({
    address: "",
    name: "",
    password: "",
    setAddress: (address: string) => set({ address }),
    setName: (name: string) => set({ name }),
    setPassword: (password: string) => set({ password }),
}))

export default store