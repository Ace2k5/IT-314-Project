export const BackendConnection = () => ({
    CheckStatus: async () => {
        const response = await fetch("http://localhost:9999/status")
        if (!response){
            console.log("Was not able to get a response from the backend.")
            return {"text": "None"}
        }
        console.log("OK")
        return await response.json()
    }
})