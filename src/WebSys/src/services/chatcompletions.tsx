import { create } from 'zustand'
import { useAIProps } from '../middle-man/aiprovider'
import { BackendConnection } from '../api/receiveAPI'
import { getNews } from '../components/news/News'

export interface ChatMessage {
    role: "user" | "assistant" | "system",
    content: string,
}

export interface ChatCompletions {
    loading: boolean,
    message: string,
    messageHistory: ChatMessage[],
    streamingText: string,
    setLoading: (loading: boolean) => void,
    setMessage: (message: string) => void,
    setMessageHistory: (history: ChatMessage[]) => void,
    appendMessage: (message: ChatMessage) => void,
    setStreamingText: (streamingText: string) => void
}

export const useChatCompletions = create<ChatCompletions>((set, get) => ({
    loading: false,
    message: '',
    messageHistory: [],
    streamingText: '',
    setLoading: (newLoading) => set({loading: newLoading}),
    setMessage: (newMessage) => set({message: newMessage}),
    setMessageHistory: (newMessageHistory) => set({messageHistory: newMessageHistory}),
    appendMessage: (message) => set((state) => ({messageHistory: [...state.messageHistory, message]})),
    setStreamingText: (newStreamingText) => set({streamingText: newStreamingText})
}))


export const chatCompletions = async () => {
    const { loading, message, setLoading, setMessage, appendMessage, setStreamingText } = useChatCompletions.getState();
    const { api, key, selectedModel } = useAIProps.getState();
    const { setNews } = getNews.getState()
    if (loading === true) {
        console.log("[Frontend Chat Completions] Request already sent.")
        return
    }
    const backend = BackendConnection()
    setLoading(true)
    setMessage("")
    const query = message
    appendMessage({ role: "user", content: query });

    if (!api || !selectedModel) {
        setLoading(false)
        return;
    }
    const messageHistory = useChatCompletions.getState().messageHistory
    const res = await backend.ChatCompletions({api, key, selectedModel, messageHistory})

    if (!res.ok || !res.body) {
        console.error("No stream body", res.status);
        return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assistantText = "";
    
    // 1. Create a variable to hold the news payload
    let pendingNews: any[] = []; 

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

                // 2. Intercept our custom SSE event
                if (parsed.type === "news_data") {
                    pendingNews = parsed.payload;
                    continue; // Skip the token logic for this frame
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

    // 3. Attach the news to the final message object
    appendMessage({ 
        role: "assistant", 
        content: assistantText, 
    });
    setNews(pendingNews)
    setLoading(false)
    setStreamingText("")
};