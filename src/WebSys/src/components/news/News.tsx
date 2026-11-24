import { useNewsStore } from '../../stores/useNewsStore'
import type { NewsItem } from '../../types/api'
import './News.css'

function hostOf(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '')
    } catch {
        return url
    }
}

type NewsListProps = {
    /** Defaults to the shared store; the disaster block passes its cached list. */
    items?: NewsItem[]
}

/** Renders whatever the last search attached to the answer. Renders nothing when empty. */
export function NewsList({ items: providedItems }: NewsListProps = {}) {
    const storeItems = useNewsStore((state) => state.items)
    const items = providedItems ?? storeItems

    if (items.length === 0) return null

    return (
        <ul className="news-list">
            {items.map((item, index) => (
                <li key={`${item.url}-${index}`} className="news-item">
                    <div className="news-meta">
                        <span className="news-index">{String(index + 1).padStart(2, '0')}</span>
                        {item.provider ? (
                            <span className="news-provider">{item.provider}</span>
                        ) : null}
                        <span className="news-domain">{hostOf(item.url)}</span>
                    </div>
                    <h4 className="news-label">{item.title}</h4>
                    <p className="news-summary">{item.summary}</p>
                    <a
                        className="news-link"
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Read more <span aria-hidden="true">→</span>
                    </a>
                </li>
            ))}
        </ul>
    )
}
