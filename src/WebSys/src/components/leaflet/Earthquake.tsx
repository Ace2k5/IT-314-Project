import { useState, useEffect } from "react";
import { BackendConnection } from "../../api/receiveAPI";
import { GetEarthquakeData } from '../../cache/CacheEarthquake';
import type { Dates } from "../../cache/CacheEarthquake";
import type { Intensity } from "../../cache/CacheEarthquake";
import type { hull_information } from "./Map";


export function EarthquakeData({hull, setHull}: hull_information){
    const [date, setDate] = useState("")
    const [earthquakeInfo, setEarthquakeInfo] = useState(Array())
    const getCache = GetEarthquakeData
    const backend = BackendConnection()

    const getEarthquake = async ({year, month, day}: Dates) => {
        const events = await getCache({year, month, day})
        if (!Array.isArray(events) || events.length === 0) {
            backend.Log("[Earthquake Frontend] Cache was empty.")
            return
        }
        setEarthquakeInfo(events)
        let found_intensities = new Map()
        for (const event of events) {
            let intensities: Intensity[] = event.intensities
            for (const intensities_metadata of intensities) {
                if (intensities_metadata){
                    if (intensities_metadata.intensity === 4){
                        found_intensities.set(intensities_metadata.intensity, intensities_metadata.hull)
                    }
                    else if (intensities_metadata.intensity === 6){
                        found_intensities.set(intensities_metadata.intensity, intensities_metadata.hull)
                    }
                    else if (intensities_metadata.intensity === 8){
                        found_intensities.set(intensities_metadata.intensity, intensities_metadata.hull)
                    }
                }
            }
        }
        if (found_intensities.size > 0){
        setHull(found_intensities)
        }
        else{
            console.log("Intensity Map is empty.")
        }
    }

    useEffect(()=> {console.log(earthquakeInfo)}, [earthquakeInfo.length > 0])
    useEffect(() => { console.log(hull) }, [hull])


    return(
        <>
        <input
        type="date"
        id="start"
        value={date}
        min="2016-0-0"
        max={new Date().toString()}
        onChange={ (event) => {
            const date = event.target.value
            setDate(date)
            const [year, month, day] = date.split("-")
            if (!year || !month || !day) return
            getEarthquake({year, month, day})
        }}/>
        </>
    )

}


export function EarthquakeDebug() {
    const [date, setDate] = useState("")
    const backend = BackendConnection()

    const getEarthquake = async ({year, month, day}: Dates) => {
        const results = await backend.GetEarthquake({year, month, day})
        if (!Array.isArray(results) || results.length === 0){
            console.log("BROKEN")
        }

        for (const result of results){
            console.log(result)
        }

    
    }

    return(
        <>
        <div className="EarthquakeDate">
            <label>Start Date</label>
            <input
            type="date"
            id="start"
            value={date}
            min="2018-01-01"
            max={new Date().toString()}
            onChange={(event) => {
                const date = event.currentTarget.value;
                if (!date) return;   // empty or not fully entered yet

                const [year, month, day] = date.split("-");
                if (!year || !month || !day) return;
                setDate(date)
                getEarthquake({year, month, day});

            }} />


        </div>
        
        </>
    )

}