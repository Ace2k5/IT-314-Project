import { useState, useEffect } from "react";
import "./apisection.css"
import { BackendConnection } from "../../api/receiveAPI";
import { useAIProps } from '../../middle-man/aiprovider'

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
    const {api, selectedModel, key, mcp, setAPI, setSelectedModel, setKey, setMCP } = useAIProps();
    const [models, setModels] = useState(new Array())


    // saved data from SQL
    const [savedAPI, setSavedAPI] = useState(new Array())

    const callAPI = async(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.preventDefault()

        const response = await backend.GetModel({api, key})
        if (!response || !Array.isArray(response)){
            return
        }
        setModels(response)
        console.log(models)
    }

    useEffect(() => {console.log(`[Frontend Model API] Selected ${selectedModel}`, [selectedModel])})

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
                <div className="input-group">
                    <label>MCP Server</label>
                    <input
                    id="mcp"
                    type="text"
                    placeholder="Input MCP server"
                    onChange={(e) => setMCP(e.target.value)}
                    />
                </div>
            </div>
            <button className="connect-btn" onClick={callAPI}>Connect</button>
            <div className="model-box">
                {models.length > 0 ? (
                    <>
                        {(models).map((model: any, index: number) => (
                                    <button 
                                    key={model.id} 
                                    className={`model-item ${selectedModel === model.id ? 'active' : ''}`}
                                    onClick={() => setSelectedModel(model.id)}>
                                    {model.id}
                                </button>
                        ))}
                    </>) : null}
            </div>
        </>
    )

}