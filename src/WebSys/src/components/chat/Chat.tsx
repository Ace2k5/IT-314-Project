import { useState, useEffect } from "react";
import { useAIProps } from "../../middle-man/aiprovider";
import { BackendConnection } from "../../api/receiveAPI";
import './Chat.css'
import { useChatCompletions, chatCompletions } from "../../services/chatcompletions"
import { ShowNews } from "../news/News"

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};


export function Chat(){

    const {loading, message, messageHistory, streamingText, setMessage} = useChatCompletions()

    const {selectedModel, api, key} = useAIProps();

    useEffect(() => {
        console.log(selectedModel, api, key)
    }, [selectedModel, api, key])

    return(
        <>
        <div className="chat-box">
            <div className="display-messages">
                <div className="user-message">
                {messageHistory.length > 0 ? (messageHistory.map((msg, index) => (
                    <div key={index}>
                        {msg.role}: {msg.content}
                    </div>
                        ))
                    ) : null }
                </div>
                <div className="assistant-message">
            {streamingText && (<div> assistant: {streamingText} (typing...)</div>)}
            </div>
                
            </div>
            <div className="input-field">
                <input 
                type="text"
                disabled={loading}
                value={message}
                onChange={(e) => {setMessage(e.target.value)}}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        chatCompletions()
                    }
                }}
                />
                <button onClick={chatCompletions}>Click Me</button>
            </div>
        </div>

        <div className="News">
            <ShowNews/>
        </div>
        
        </>
    )
}