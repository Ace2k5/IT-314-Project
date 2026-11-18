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
    const [sessionId] = useState(() => crypto.randomUUID())
    useEffect(() => {
        console.log(selectedModel, api, key)
    }, [selectedModel, api, key])

    return(
        <>
        <div className="chat-box">
            <div className="display-messages">
                {messageHistory.length > 0 ? (messageHistory.map((msg, index) => (
                    <div className={`chat-message chat-message-${msg.role}`} key={index}>
                        {msg.role}: {msg.content}
                    </div>
                        ))
                    ) : null }
                {streamingText && (
                    <div className="chat-message chat-message-assistant">
                        assistant: {streamingText} (typing...)
                    </div>
                )}
            </div>
            <div className="input-field">
                <input 
                type="text"
                disabled={loading}
                value={message}
                placeholder="Type here..."
                onChange={(e) => {setMessage(e.target.value)}}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        chatCompletions(sessionId)
                    }
                }}
                />
                <button onClick={() => chatCompletions(sessionId)}>Send</button>
            </div>
        </div>

        <div className="News">
            <ShowNews/>
        </div>
        
        </>
    )
}