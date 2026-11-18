import { create } from 'zustand'
import { useEffect } from 'react';

interface NewsItem {
    title: string,
    url: string,
    summary: string,
    provider: string,
}

interface News {
    news: NewsItem[],
    setNews: (news: any[]) => void;
}

export const useNewsStore = create<News>((set) => ({
    news: [],
    setNews: (newNews: any[]) => set({news: newNews})
}))

export function ShowNews(){
    const news = useNewsStore((state) => state.news)
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