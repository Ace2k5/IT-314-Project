import { useState } from "react";
import { BackendConnection } from "../../api/receiveAPI";

export function CheckStatus(){
    const [text, setText] = useState("")

    const checkstatus = async () => {
        const backend = BackendConnection()
        const response = await backend.CheckStatus()
        if (response){
            setText(response.text)
        }
    }

    return(
        <>
        <button onClick={checkstatus}>Call Backend</button>
        {text && <p>{text}</p>}
        </>
    )
}