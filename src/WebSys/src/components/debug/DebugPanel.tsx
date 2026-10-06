import { useState } from "react";
import { BackendConnection } from "../../api/receiveAPI";
import { Earthquake } from "../leaflet/Earthquake";



export function CheckStatus(){
    const [text, setText] = useState("")
    const backend = BackendConnection()

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
                <Earthquake/>

            </div>
        </div>


        </>
    )
}