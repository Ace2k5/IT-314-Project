import { useState } from "react";
import { BackendConnection } from "../../api/receiveAPI";



export function CheckStatus(){
    const [text, setText] = useState("")
    const [earthquake, setEarthquake] = useState(new Map())
    const backend = BackendConnection()

    const checkearthquake = async () => {
        const response = await backend.GetEarthquake()
        console.log(response)
        if (response){
            setEarthquake(response)
        }
    }

    const checkstatus = async () => {
        const response = await backend.Log("Hello")
        console.log(response)
        if (response){
            setText(response.log_message)
            
        }
    }

    return(
        <>
        <div className="debug-component">
            <div className="status">
                <button onClick={checkstatus}>Call Backend</button>
                {text && <p>{text}</p>}
            </div>

            <div className="earthquakeStatus">
                <button onClick={checkearthquake}>Get Earthquake</button>
                {earthquake ? Object.entries(earthquake).map((key:any,value:any) => (
                    <p key={key}>{value}</p>
                )) : <p>None</p>
            }

            </div>
        </div>


        </>
    )
}