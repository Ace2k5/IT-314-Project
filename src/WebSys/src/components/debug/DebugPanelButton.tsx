import { useState } from 'react';
import { BackendConnection } from '../../api/receiveAPI';
import { CheckStatus } from './DebugPanel';

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
        {open === "debug" && <CheckStatus/>}
        </>
    )
}