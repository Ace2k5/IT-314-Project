import { useState, useEffect } from "react";
import { useAIProps } from "../../middle-man/aiprovider";
import { BackendConnection } from "../../api/receiveAPI";
import './Chat.css'

export type ChatCompletions = {
    api: string,
    key: string,
    selectedModel: string,
    history: Array<Record<string, string>>
}

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};


export function Chat(){
    const backend = BackendConnection()

    const {selectedModel, api, key} = useAIProps();
    const [messageHistory, setMessageHistory] = useState<ChatMessage[]>([])
    const [message, setMessage] = useState('')
    const [streamingText, setStreamingText] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        console.log(selectedModel, api, key)
    }, [selectedModel, api, key])


    const chatCompletions = async () => {
        if (loading === true) {
            console.log("[Frontend Chat Completions] Request already sent.")
            return
        }
        setLoading(true)
        setMessage("")
        const query = message
        const history = [{ role: "user", content: query }];
        if (!api || !selectedModel) return;

        const res = await fetch("http://localhost:9999/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ api, key, selectedModel, history }),
        });

        if (!res.ok || !res.body) {
            console.error("No stream body", res.status);
            return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantText = "";

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // SSE frames are separated by \n\n
            const frames = buffer.split("\n\n");
            buffer = frames.pop() ?? ""; // keep incomplete tail

            for (const frame of frames) {
            const line = frame.trim();
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
                const parsed = JSON.parse(data);
                if (parsed.error) {
                console.error("Provider error:", parsed.error);
                continue;
                }
                const token = parsed.choices?.[0]?.delta?.content ?? "";
                if (token) {
                assistantText += token;
                setStreamingText(assistantText)
                }
            } catch (e) {
                // ignore partial JSON — should not happen if buffering is correct
                }
            }
        }

        setMessageHistory(prev => [
            ...prev,
            { role: "user", content: query },
            { role: "assistant", content: assistantText },
        ]);
        setLoading(false)
        setStreamingText("")
        };

    return(
        <>
        <div className="chat-box">
            <div className="display-messages">
                {messageHistory.length > 0 ? (messageHistory.map((msg, index) => (
                    <div key={index}>
                        {msg.role}: {msg.content}
                    </div>
                ))
            ) : null }
            {streamingText && (
        <div>
            assistant: {streamingText} (typing...)
        </div>
            )}
                
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
        
        </>
    )
}