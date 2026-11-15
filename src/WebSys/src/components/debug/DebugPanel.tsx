import { useState } from "react";
import { BackendConnection } from "../../api/receiveAPI";
import { CacheEvacCenter } from "../../cache/CacheEvacCenter";
import type { EvacuationCenter } from "../../cache/CacheEvacCenter";

type ShowDebugProps = {
    open: string | null,
    setOpen: (value: string | null) => void
}

export function ShowDebugPanel({open, setOpen}: ShowDebugProps) {
    const backend = BackendConnection()

    const debug = () => {
        if (open === "debug"){
            backend.Log("Closing Debug Panel")
            setOpen(null)
        }
        else {
            backend.Log("Openign Debug Panel")
            setOpen("debug")
        }
    }

    return(
        <>
        <button onClick={debug}>{open === "debug" ? <p>Close Debug Panel</p> : <p>Show Debug Panel</p>}</button>
        </>
    )
}

export function Debug(){
    const [text, setText] = useState("")
    const backend = BackendConnection()
    const [evac, setEvac] = useState(new Map<String, String | number>)

    const checkstatus = async () => {
        const response = await backend.Log("Hello")
        console.log(response)
        if (response){
            setText(response.log_message)
        }
    }

    const getEvac = async() => {
        const response = await CacheEvacCenter()
        setEvac(response)
        console.log(response)
    }

    return(
        <>
        <div className="debug-component">
            <div className="status">
                <button onClick={checkstatus}>Call Backend</button>
                {text && <p>{text}</p>}
            </div>

            <div className="evac-centers">
                <button onClick={getEvac}> Check Evac Centers </button>
            </div>
        </div>
        </>
    )
}