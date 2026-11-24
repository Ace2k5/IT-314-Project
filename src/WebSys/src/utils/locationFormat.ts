/** "±" is added by the caller; this only formats the distance. */
export function formatAccuracy(accuracy: number) {
    return accuracy >= 1000 ? `${Math.round(accuracy / 1000)} km` : `${Math.round(accuracy)} m`
}
