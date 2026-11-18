type ShowChatProps = {
    open: string | null,
    setOpen: (value: string | null) => void
}

export function ShowChat({open, setOpen}: ShowChatProps) {
    const isOpen = () => {
        if (open === "chat"){
            setOpen(null)
        }
        else{
            setOpen("chat")
        }
    }

    return (
        <>
            <button type="button" onClick={isOpen}>
                {open === "chat" ? 'Close Chat' : 'Chat'}
            </button>
        </>
    )
}