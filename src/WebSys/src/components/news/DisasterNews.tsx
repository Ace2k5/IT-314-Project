import { chatCompletions,  useChatCompletions } from "../../services/chatcompletions";
import { getNews } from "./News";
import { useState, useEffect, useRef } from "react";

export function DisasterNews(){
    const {setMessage, appendMessage, setMessageHistory} = useChatCompletions()
    const {news} = getNews()
    const [sessionId] = useState(() => crypto.randomUUID())

    const hasFetched = useRef(false)

    useEffect( () => {
        if (hasFetched.current) return;
        hasFetched.current = true
        setMessage("Search up the latest news regarding Typhoons and Earthquakes.")
        chatCompletions(sessionId)
        return () => (setMessageHistory([]))
    }, [])
    return (
        <>
                {news.length > 0 ? news.map((fetched_news, index) => (
                    <div key={index}>
                        <label className="news-label">{fetched_news.title}</label> 
                        <p>{fetched_news.summary}</p>
                        <a href={fetched_news.url}>{fetched_news.url}</a>
                    </div>
                    )) : null }
        
        </>
    )
}