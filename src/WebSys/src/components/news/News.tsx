import { create } from 'zustand'
import { useEffect } from 'react';

interface News {
    news: any[],
    setNews: (news: any[]) => void;
}

export const getNews = create<News>((set) => ({
    news: [],
    setNews: (newNews: any[]) => set({news: newNews})
}))

export function ShowNews(){
    const {news} = getNews()
    useEffect( () => {
        console.log(news)
    }, [news])

    return(
        <>
        {news.length > 0 ? news.map((fetched_news, index) => (<>
            <div key={index}>
            <label>{fetched_news.title}</label>
            <p>{fetched_news.summary}</p>
            <a href={fetched_news.url}>{fetched_news.url}</a>
            </div>
            </>
        )) : null }
        </>
    )
}