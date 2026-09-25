import { useState } from "react";
import { BackendConnection } from "../../api/receiveAPI";
import { Map } from "./Map";

type ShowMapProps = {
    open: string | null,
    setOpen: (value: string | null) => void
}

export function ShowMap({open, setOpen}: ShowMapProps){
    const backend = BackendConnection()

    const map = () => {
        if (open === "map"){
            backend.Log("Closing Map.")
            setOpen(null)
        }
        else{
            backend.Log("Opening Map.")
            setOpen("map")
        }
    }

    return(
    <>
    <button onClick={map}>{open === "map" ? <p>Close Map</p> : <p>Show Map</p> }</button>
    {open === "map" && <Map/>}
    </>
    )
}