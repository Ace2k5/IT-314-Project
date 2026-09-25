export const BackendConnection = () => ({
    CheckStatus: async () => {
        const response = await fetch("http://localhost:9999/status")
        if (!response){
            console.log("Was not able to get a response from the backend.")
            return null
        }
        console.log("OK")
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
    }

})