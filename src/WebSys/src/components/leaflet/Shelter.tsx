import { BackendConnection } from "../../api/receiveAPI";
import { create } from "zustand";
import type { EvacuationCenter } from "../../cache/CacheEvacCenter";

interface Location {
    lat: number,
    long: number
}

interface ShelterItems {
    id: number,
    name: string,
    location: Location | null
    type: string,
    address: string
    setId: (id: number) => void,
    setName: (name: string) => void,
    setLocation: (location: Location) => void,
    setType: (type: string) => void,
    setAddress: (address: string) => void    
}

const ShelterStore  = create<ShelterItems>((set) => ({
    id: 0,
    name: "",
    location: null,
    type: "",
    address: "",
    setId: (newId) => set({id: newId}),
    setName: (newName) => set({name: newName}),
    setLocation: (newLocation) => set({location: newLocation}),
    setType: (newType) => set({type: newType}),
    setAddress: (newAddress) => set({address: newAddress})
}))


export function Shelter() {
    const backend = BackendConnection()

}