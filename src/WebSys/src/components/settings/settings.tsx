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
    const [endpoint, setEndpoint] = useState("")
    const [endpointDraft, setEndpointDraft] = useState("")

    const [api, setAPI] = useState("")
    const [apiDraft, setAPIDraft] = useState("")
    const [model, setModel] = useState("")

    const openSettings = () => {
        if (open === "settings") {
            setOpen(null)
        }
        else {
            setOpen("settings")
        }
    }

    const callAPI = (e: React.SubmitEvent) => {
        e.preventDefault()
        setAPI(apiDraft)
        setEndpoint(endpointDraft)
    }

    return(
        <>
        <div className="settings-background">
            <div className="settings">
                <h2>Settings</h2>
                    <form onSubmit={(e) => callAPI(e)}>
                        <div className="modelapi">
                            <p>Endpoint</p>
                            <input
                            id="endpoint"
                            type="text"
                            placeholder="Enter OpenAI compatible endpoint"
                            onChange={(e) => setAPIDraft(e.target.value)}/>
                            <br/>
                            <p>API Key</p>
                            <input
                            id="apikey"
                            type="password"
                            placeholder="Input API"
                            onChange={(e) => setEndpointDraft(e.target.value)}/>
                        </div>

                        <button type="submit">Connect</button>
                    </form>
                <button onClick={openSettings}>
                    <p>Click me!</p>
                </button>
                
            </div>
        </div>
        </>
    )

}