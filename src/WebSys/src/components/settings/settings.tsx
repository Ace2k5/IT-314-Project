import { useEffect, useState } from "react";
import React from "react";
import { BackendConnection } from "../../api/receiveAPI";
import "./settings.css"
import { SettingsAPI, SettingsAPIButton } from "./apisection";

type ShowSettingsProps = {
    openSettings: boolean,
    setOpenSettings: React.Dispatch<React.SetStateAction<boolean>>
}

export function SettingsButton({openSettings, setOpenSettings}: ShowSettingsProps){
    const open = () => {
        if (openSettings === true) {
            setOpenSettings(false)
        }
        else {
            setOpenSettings(true)
        }
    }

    return(
    <>
    <button onClick={open}>{(openSettings === true) ? <p>Close Settings</p> : <p>Open Settings</p>}</button>
    </>
    )
}

export function Settings({openSettings, setOpenSettings}: ShowSettingsProps) {
    const [activeSection, setActiveSection] = useState("api")

    const open = () => {
        if (openSettings === true) {
            setOpenSettings(false)
        }
        else {
            setOpenSettings(true)
        }
    }

    return(
        <>
        <div className="settings-background">
            <div className="settings">
                <button className="exit-btn" onClick={open}><p>X</p></button>
                <div className="sidebar">
                    <SettingsAPIButton activeSection={activeSection} setActiveSection={setActiveSection}/>
                </div>

                <div className="settings-content">
                    {activeSection === "api" ? <SettingsAPI/> : null}
                </div>

            </div>
        </div>
        </>
    )

}