import { useState, useEffect } from "react";
import "./apisection.css"
import { BackendConnection } from "../../api/receiveAPI";

type SettingsProps = {
    activeSection: String,
    setActiveSection: React.Dispatch<React.SetStateAction<string>>
}

export type APIProps = {
    api: String,
    key: String,
}

export function SettingsAPIButton({activeSection, setActiveSection}: SettingsProps){
    const setSection = () => {
        setActiveSection("api")
    }

    return(
        <>
        <button className="btn-sidebar" onClick={setSection}>API</button>
        </>
    )
}

export function SettingsAPI(){

    const backend = BackendConnection()


    // input fields
    const [key, setKey] = useState("")

    const [api, setAPI] = useState("")
    const [model, setModel] = useState("")


    // saved data from SQL
    const [savedAPI, setSavedAPI] = useState(new Array())

    const callAPI = async(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.preventDefault()

        const response = await backend.GetModel({api, key})
        if (!response){
            return
        }
        setSavedAPI(response)
    }
    
    return(
        <>       
            <div className="model-api">
                <h2>API Configuration</h2>
                <div className="input-group">
                    <label>Endpoint</label>
                    <input
                    id="endpoint"
                    type="text"
                    placeholder="Enter OpenAI compatible API"
                    onChange={(e) => setAPI(e.target.value)}/>
                </div>
                <div className="input-group">
                    <label>API Key</label>
                    <input
                    id="apikey"
                    type="password"
                    placeholder="Input Key (Optional if local host)"
                    onChange={(e) => setKey(e.target.value)}/>
                </div>
            </div>
            <button className="connect-btn" onClick={callAPI}>Connect</button>

            {savedAPI.length != 0 ? console.log(savedAPI) : null}
        </>
    )

}