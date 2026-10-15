import { useState } from "react";
import { BackendConnection } from "../../api/receiveAPI";
import { GetEarthquakeData } from '../../cache/CacheEarthquake';



type Dates = {
    year: string,
    month: string,
    day: string
}

export function Earthquake() {
    const [intensityFour, setIntensityFour] = useState([])
    const [intensitySix, setIntensitySix] = useState([])
    const [intensityEight, setIntensityEight] = useState([])
    const [locations, setLocations] = useState([])
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
            value={new Date().toString()}
            min="2018-01-01"
            max={new Date().toString()}
            onChange={(event) => {
                const date = event.currentTarget.value;
                if (!date) return;   // empty or not fully entered yet

                const [year, month, day] = date.split("-");
                if (!year || !month || !day) return;

                getEarthquake({year, month, day});

            }} />


        </div>
        
        </>
    )

}