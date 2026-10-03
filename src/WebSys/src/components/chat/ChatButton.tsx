import { Chat } from './Chat'

type ShowChatProps = {
    open: string | null,
    setOpen: (value: string | null) => void
}

export function ShowChat({open, setOpen}: ShowChatProps) {
    const isOpen = open === 'chat'

    return (
        <>
            <button type="button" onClick={() => setOpen(isOpen ? null : 'chat')}>
                {isOpen ? 'Close Chat' : 'Chat'}
            </button>
            {isOpen && <Chat/>}
        </>
    )
}