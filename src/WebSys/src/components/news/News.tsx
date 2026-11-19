import { useNewsStore } from '../../stores/useNewsStore'

/** Renders whatever the last search attached to the answer. Renders nothing when empty. */
export function NewsList() {
    const items = useNewsStore((state) => state.items)

    if (items.length === 0) return null

    return (
        <ul className="news-list">
            {items.map((item, index) => (
                <li key={`${item.url}-${index}`} className="news-item">
                    <h4 className="news-label">{item.title}</h4>
                    <p>{item.summary}</p>
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                        {item.url}
                    </a>
                </li>
            ))}
        </ul>
    )
}
