import { useState } from "react";
import { BackendConnection } from "../../api/receiveAPI";

type Dates = {
    year: number,
    month: number,
    day: number
}

export function Earthquake() {
    const [intensityFour, setIntensityFour] = useState([])
    const [intensitySix, setIntensitySix] = useState([])
    const [intensityEight, setIntensityEight] = useState([])
    const [locations, setLocations] = useState([])
    const backend = BackendConnection()

    const getEarthquake = async (date_dict: Dates) => {
        const result = await backend.GetEarthquake(date_dict)
        result.forEach((event) => {
            console.log(event.description, event.enddate, event.eventid, event.initialdate, event.severity, event.severitytext)
            event.intensities.forEach((ring) => {
                console.log(ring.intensity, ring.width, ring.height);
            })

        })
    
    }

    return(
        <>
        <div className="Test">
            <label>Start Date</label>
            <input
            type="date"
            id="start"
            value={new Date().toString()}
            min="2018-01-01"
            max={new Date().toString()}
            onChange={(event) => {
                const date = event.currentTarget.value
                const date_array = date.split("-")
                const date_dict = {
                    "year": Number(date_array[0]),
                    "month": Number(date_array[1]),
                    "day": Number(date_array[2])
                }
                getEarthquake(date_dict)

            }} />
        </div>
        
        </>
    )

}