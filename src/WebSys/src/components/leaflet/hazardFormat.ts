/** Formatting shared by the hazard pickers and the showcase cards. */

export function formatEventDate(value: string | null | undefined): string {
    if (!value) return 'Date unavailable'

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value

    return parsed.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

/** The short pill shown on an event row: severity first, then the alert level. */
export function eventBadge(
    severityText: string | null | undefined,
    alertLevel: string | null | undefined,
): string {
    return severityText?.trim() || alertLevel?.trim() || ''
}
