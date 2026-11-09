import { create } from 'zustand'

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

    return(
        <>
        {news.length > 0 ? news.map((fetched_news, index) => {
            <p id={index}>{fetched_news}</p>
        }) : null }
        </>
    )
}