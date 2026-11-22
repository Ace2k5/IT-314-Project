import { useState } from 'react'
import type { FormEvent } from 'react'

import { backend } from '../../api/backendClient'
import { useSettingsStore } from '../../stores/useSettingsStore'
import type { SettingsSection } from './sections'
import userIcon from './settings_assets/user_icon.png'
import './LoginSection.css'

type SectionButtonProps = {
    activeSection: SettingsSection
    setActiveSection: (section: SettingsSection) => void
    isLoggedIn: boolean
    username: string
}

export function LoginSectionButton({ activeSection, setActiveSection, isLoggedIn, username }: SectionButtonProps) {
    return (
        <button
            type="button"
            className={`btn-sidebar${activeSection === 'login' ? ' active' : ''}`}
            onClick={() => setActiveSection('login')}
            title={isLoggedIn && username ? `Signed in as ${username}` : undefined}
        >
            {isLoggedIn ? (
                <img className="btn-avatar" src={userIcon} alt="" />
            ) : (
                <svg
                    className="btn-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <circle cx="12" cy="8" r="3.2" />
                    <path d="M5.5 20c0-3.6 3-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
                </svg>
            )}
            <span>Account</span>
        </button>
    )
}

export function LoginSection() {
    const api = useSettingsStore((state) => state.api)
    const apiKey = useSettingsStore((state) => state.apiKey)
    const searchKey = useSettingsStore((state) => state.searchKey)
    const username = useSettingsStore((state) => state.username)
    const setUsername = useSettingsStore((state) => state.setUsername)
    const setApi = useSettingsStore((state) => state.setApi)
    const setApiKey = useSettingsStore((state) => state.setApiKey)
    const setSearchKey = useSettingsStore((state) => state.setSearchKey)
    const reset = useSettingsStore((state) => state.reset)

    const [inputUsername, setInputUsername] = useState('')
    const [inputPassword, setInputPassword] = useState('')
    const [status, setStatus] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isRegister, setIsRegister] = useState(false)

    const handleLogout = () => {
        reset()
        setInputUsername('')
        setInputPassword('')
        setIsRegister(false)
        setStatus('Logged out.')
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsSubmitting(true)
        setStatus('')

        if (isRegister) {
            const result = await backend.registerUser({
                username: inputUsername,
                password: inputPassword,
                api,
                api_key: apiKey,
                search_key: searchKey,
            })

            if (result?.success) {
                setStatus('Registration successful. You can now log in.')
                setIsRegister(false)
                setInputUsername('')
                setInputPassword('')
            } else {
                setStatus(result?.error || 'Registration failed.')
            }
        } else {
            const result = await backend.loginUser({ username: inputUsername, password: inputPassword })

            if (result?.success) {
                setUsername(result.username || '')
                setApi(result.api || '')
                setApiKey(result.api_key || '')
                setSearchKey(result.search_key || '')
                setStatus('')
            } else {
                setStatus(result?.error || 'Login failed.')
            }
        }

        setIsSubmitting(false)
    }

    if (username) {
        return (
            <div className="account-profile">
                <img className="account-avatar" src={userIcon} alt="" />
                <p className="account-label">Logged in as:</p>
                <p className="account-username">{username}</p>
                <button type="button" className="account-logout" onClick={handleLogout}>
                    Log out
                </button>
            </div>
        )
    }

    return (
        <form className="login-form" onSubmit={handleSubmit}>
            <h2>{isRegister ? 'Register' : 'Login'}</h2>
            <p className="section-description">
                {isRegister
                    ? 'Create an account to keep your endpoint and keys in one place.'
                    : 'Sign in to keep your endpoint and keys in one place.'}
            </p>

            <div className="input-group">
                <label htmlFor="login-username">Username</label>
                <input
                    id="login-username"
                    type="text"
                    placeholder="Enter username"
                    value={inputUsername}
                    onChange={(e) => setInputUsername(e.target.value)}
                    required
                />
            </div>

            <div className="input-group">
                <label htmlFor="login-password">Password</label>
                <input
                    id="login-password"
                    type="password"
                    placeholder="Enter password"
                    value={inputPassword}
                    onChange={(e) => setInputPassword(e.target.value)}
                    required
                />
            </div>

            <button
                className="login-btn"
                type="submit"
                disabled={isSubmitting}
            >
                {isSubmitting
                    ? (isRegister ? 'Registering...' : 'Logging in...')
                    : (isRegister ? 'Register' : 'Login')}
            </button>

            {status ? <p className="login-status">{status}</p> : null}

            <p className="login-toggle">
                {isRegister
                    ? 'Already have an account?'
                    : "Don't have an account?"}
                {' '}
                <button
                    type="button"
                    className="toggle-link"
                    onClick={() => {
                        setIsRegister(!isRegister)
                        setStatus('')
                    }}
                >
                    {isRegister ? 'Login' : 'Register'}
                </button>
            </p>
        </form>
    )
}
