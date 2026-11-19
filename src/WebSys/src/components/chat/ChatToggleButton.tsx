import { useUiStore } from '../../stores/useUiStore'

export function ChatToggleButton() {
    const activePanel = useUiStore((state) => state.activePanel)
    const togglePanel = useUiStore((state) => state.togglePanel)
    const isOpen = activePanel === 'chat'

    return (
        <button type="button" onClick={() => togglePanel('chat')}>
            {isOpen ? 'Close Chat' : 'Chat'}
        </button>
    )
}
