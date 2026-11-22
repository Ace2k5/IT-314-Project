import type { EarthquakeEvent, TyphoonEvent } from '../../types/api'
import { eventBadge, formatEventDate } from './hazardFormat'

type HazardShowcaseProps =
    | {
          hazard: 'earthquake'
          event: EarthquakeEvent
          onChange: () => void
          onClear: () => void
      }
    | {
          hazard: 'typhoon'
          event: TyphoonEvent
          onChange: () => void
          onClear: () => void
      }

/** Details for the selected event, shown inside the floating hazard window. */
export function HazardShowcase(props: HazardShowcaseProps) {
    const { onChange, onClear } = props

    return (
        <div className="hazard-details">
            {props.hazard === 'earthquake' ? (
                <>
                    <p className="hazard-details-title">{props.event.description}</p>
                    <dl className="hazard-facts">
                        <dt>Date</dt>
                        <dd>{formatEventDate(props.event.initialdate)}</dd>
                        <dt>Severity</dt>
                        <dd>{props.event.severitytext?.trim() || props.event.severity || '—'}</dd>
                        <dt>Alert</dt>
                        <dd>{props.event.alertlevel?.trim() || '—'}</dd>
                        <dt>Intensity zones</dt>
                        <dd>{props.event.intensities?.length ?? 0}</dd>
                    </dl>
                </>
            ) : (
                <>
                    <p className="hazard-details-title">{props.event.description}</p>
                    <dl className="hazard-facts">
                        <dt>Date</dt>
                        <dd>{formatEventDate(props.event.initialdate)}</dd>
                        <dt>Severity</dt>
                        <dd>
                            {eventBadge(props.event.severitytext, props.event.alertlevel) ||
                                (props.event.severity ?? '—')}
                        </dd>
                        <dt>Alert</dt>
                        <dd>{props.event.alertlevel?.trim() || '—'}</dd>
                        <dt>Max radius</dt>
                        <dd>
                            {props.event.radius_km ? `${Math.round(props.event.radius_km)} km` : '—'}
                        </dd>
                        <dt>Track points</dt>
                        <dd>{props.event.track?.length ?? 0}</dd>
                    </dl>
                </>
            )}

            <div className="hazard-details-actions">
                <button type="button" className="hazard-link" onClick={onChange}>
                    Change event
                </button>
                <button type="button" className="hazard-link" onClick={onClear}>
                    Clear selection
                </button>
            </div>
        </div>
    )
}
