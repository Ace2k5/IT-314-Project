import { useEffect, useState } from "react";
import React from "react";
import { BackendConnection } from "../../api/receiveAPI";
import "./settings.css"

type ShowSettingsProps = {
    open: string | null,
    setOpen: (value: string | null) => void
}

export function SettingsButton({open, setOpen}: ShowSettingsProps){
    const openSettings = () => {
        if (open === "settings") {
            setOpen(null)
        }
        else {
            setOpen("settings")
        }
    }

    return(
    <>
    <button onClick={openSettings}>{(open === "settings") ? <p>Close Settings</p> : <p>Open Settings</p>}</button>
    </>
    )
}

export function Settings({open, setOpen}: ShowSettingsProps) {
    const [apiDraft, setApiDraft] = useState("")
    const [endpoint, setEndpoint] = useState("")
    const [endpointDraft, setEndpointDraft] = useState("")

    const [api, setAPI] = useState("")
    const [model, setModel] = useState("")

    const openSettings = () => {
        if (open === "settings") {
            setOpen(null)
        }
        else {
            setOpen("settings")
        }
    }

    return(
        <>
        <div className="settings-background">
            <div className="settings">
                <h2>Settings</h2>
                <div className="modelapi">
                    <input
                    id="endpoint"
                    type="text"
                    placeholder="Enter OpenAI compatible endpoint"/>
                    <br/>

                    <input
                    id="apikey"
                    type="text"
                    placeholder="Input API"/>
                </div>
                <button onClick={openSettings}>
                    <p>Click me!</p>
                </button>
                
            </div>
        </div>
        </>
    )

}