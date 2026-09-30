export const BackendConnection = () => ({
    CheckStatus: async () => {
        const response = await fetch("http://localhost:9999/status")
        if (!response){
            console.log("Was not able to get a response from the backend.")
            return null
        }
        BackendConnection().Log("OK")
        return await response.json()
    },
    Log: async (message: string) => {
        const response = await fetch("http://localhost:9999/log", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({"key": message})
        })
        if (!response){
            console.log("Could not access log api.")
            return null
        }
        console.log(`OK`)
        return await response.json()
    },
    GetWeather: async (is_detailed: Boolean) => {
        const response = await fetch("http://localhost:9999/weather", {
            method: "POST",
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({is_detailed: is_detailed})
        })
        if (!response){
            BackendConnection().Log("Failed to get weather information.")
        }
        else{
            BackendConnection().Log("OK: Weather")
            console.log("OK: Weather")
        }
        return await response.json()
    },
    GetEarthquake: async () => {
        const response = await fetch("http://localhost:9999/earthquake")
        if (!response){
            BackendConnection().Log("Failed to get earthquake information.")
        }
        else {
            BackendConnection().Log("OK: Earthquake")
            console.log("OK: Earthquake")
        }
        return await response.json()
    }

})