import { BackendConnection } from "../../api/receiveAPI";
import { MMap } from "./Map";

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
    <button onClick={map}>{open === "map" ? <p>Close Map</p> : <p>Map</p> }</button>
    </>
    )
}