import { useState } from "react";
import { BackendConnection } from "../../api/receiveAPI";

type WeatherProps = {
    open: string | null
}

export function GetWeather({open}: WeatherProps){
    const [info, setInfo] = useState("")
    const backend = BackendConnection()
    
    const getInfo = async() => {
        const response = await backend.GetWeather()
        
        if (!response){
            let temp = backend.Log("Could not get the weather information.")
            if (!temp){
                console.log("Could not get the log information. Check the Uvicorn server.")
            }
        }
        setInfo(`Timezone: ${response.timezone}\nLatitude: ${response.latitude}\nLongtitude: ${response.longitude}`)
    }

    return(
        <>
        {open === "map" ? <button onClick={getInfo}>Get weather information</button> : null}
        {open === "map" && <p>{info}</p>}
        </>
    )
}