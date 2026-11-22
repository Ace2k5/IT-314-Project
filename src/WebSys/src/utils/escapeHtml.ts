const HTML_ESCAPES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
}

/**
 * Escape text before it is interpolated into a Leaflet `divIcon` HTML string.
 * Leaflet renders that string as raw HTML, so any value that did not originate
 * in this file has to be escaped first.
 */
export function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character)
}
