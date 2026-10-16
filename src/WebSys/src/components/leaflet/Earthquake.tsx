import { useState, useEffect } from "react";
import { BackendConnection } from "../../api/receiveAPI";
import { GetEarthquakeData } from '../../cache/CacheEarthquake';
import type { Dates } from "../../cache/CacheEarthquake";

export function EarthquakeData(){
    const [date, setDate] = useState("")
    const [earthquakeInfo, setEarthquakeInfo] = useState(new Array())
    const getCache = GetEarthquakeData
    const backend = BackendConnection()

    const getEarthquake = async ({year, month, day}: Dates) => {
        const events = await getCache({year, month, day})
        if (!Array.isArray(events) || events.length === 0) {
            backend.Log("[Earthquake Frontend] Cache was empty.")
            return
        }
        setEarthquakeInfo(events)
    }
    useEffect(()=> {console.log(earthquakeInfo)}, [earthquakeInfo])


    return(
        <>
        <div className="GetEarthquakeInfo">
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
        <div className="DisplayEarthquake">
            {/*earthquakeInfo.length === 0 && */}

        </div>


        </div>


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
        <div className="Test">
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