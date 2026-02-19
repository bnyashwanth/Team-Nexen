'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'

export default function SignupPage() {
    const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' })
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const router = useRouter()

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setMessage('')
        if (formData.password !== formData.confirmPassword) {
            setMessage('error:Passwords do not match')
            setIsLoading(false)
            return
        }
        try {
            const result = await apiClient.signup({ name: formData.name, email: formData.email, password: formData.password })
            if (result.error) { setMessage(`error:${result.error}`) }
            else { setMessage('success:Account created! Redirecting...'); setTimeout(() => router.push('/login'), 1500) }
        } catch { setMessage('error:An error occurred during signup') }
        finally { setIsLoading(false) }
    }

    const handleSocialLogin = (provider: string) => { setMessage(`info:Demo: Redirecting to ${provider}...`) }

    const getStrength = (pwd: string) => {
        if (!pwd) return { label: '', color: '', width: '0%' }
        if (pwd.length < 6) return { label: 'Weak', color: '#ef4444', width: '25%' }
        if (pwd.length < 8) return { label: 'Fair', color: '#f59e0b', width: '50%' }
        const has = { upper: /[A-Z]/.test(pwd), num: /[0-9]/.test(pwd), special: /[^a-zA-Z0-9]/.test(pwd) }
        const count = [has.upper, has.num, has.special].filter(Boolean).length
        if (count >= 3) return { label: 'Strong', color: '#10b981', width: '100%' }
        if (count >= 2) return { label: 'Good', color: '#6366f1', width: '75%' }
        return { label: 'Fair', color: '#f59e0b', width: '50%' }
    }

    const strength = getStrength(formData.password)
    const msgType = message.split(':')[0]
    const msgText = message.substring(message.indexOf(':') + 1)

    return (
        <div className="min-h-screen flex" style={{ background: '#f8fafc' }}>
            {/* Left Panel */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #312e81 0%, #4338ca 40%, #6366f1 100%)' }}>
                <div className="absolute w-72 h-72 rounded-full animate-float"
                    style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08), transparent)', top: '15%', right: '10%' }} />
                <div className="absolute w-96 h-96 rounded-full animate-float"
                    style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.05), transparent)', bottom: '10%', left: '5%', animationDelay: '1.5s' }} />
                <div className="absolute inset-0 opacity-[0.04]"
                    style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
                <div className="relative z-10 text-center px-12 animate-fade-in">
                    <div className="mb-8">
                        <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center animate-pulse-glow"
                            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold mb-4 text-white">Nexen</h1>
                    <p className="text-lg mb-2 text-indigo-100">Join the Intelligence Platform</p>
                    <p className="text-sm max-w-sm mx-auto text-indigo-200/80">
                        Get started with real-time supply chain monitoring and AI-powered analytics.
                    </p>
                </div>
            </div>

            {/* Right Panel */}
            <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 bg-white">
                <div className="w-full max-w-md mx-auto animate-fade-in">
                    <div className="lg:hidden text-center mb-8">
                        <h1 className="text-3xl font-bold gradient-text">Nexen</h1>
                        <p className="text-sm mt-1 text-slate-400">Supply Chain Intelligence</p>
                    </div>
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-800">Create your account</h2>
                        <p className="mt-2 text-sm text-slate-400">Start monitoring your supply chain in minutes</p>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="name" className="block text-xs font-medium uppercase tracking-wider mb-2 text-slate-400">Full Name</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                </div>
                                <input id="name" name="name" type="text" required className="input-light w-full pl-12" placeholder="John Doe" value={formData.name} onChange={handleChange} />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wider mb-2 text-slate-400">Email</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                                </div>
                                <input id="email" name="email" type="email" autoComplete="email" required className="input-light w-full pl-12" placeholder="you@company.com" value={formData.email} onChange={handleChange} />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wider mb-2 text-slate-400">Password</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                                </div>
                                <input id="password" name="password" type={showPassword ? 'text' : 'password'} required className="input-light w-full pl-12 pr-12" placeholder="Create a strong password" value={formData.password} onChange={handleChange} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        {showPassword ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><line x1="1" y1="1" x2="23" y2="23" /></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>}
                                    </svg>
                                </button>
                            </div>
                            {formData.password && (
                                <div className="mt-2">
                                    <div className="h-1 rounded-full overflow-hidden bg-slate-100">
                                        <div className="h-full rounded-full transition-all duration-300" style={{ width: strength.width, background: strength.color }} />
                                    </div>
                                    <p className="text-xs mt-1 font-medium" style={{ color: strength.color }}>{strength.label}</p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-xs font-medium uppercase tracking-wider mb-2 text-slate-400">Confirm Password</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                                </div>
                                <input id="confirmPassword" name="confirmPassword" type="password" required className="input-light w-full pl-12" placeholder="Confirm your password" value={formData.confirmPassword} onChange={handleChange} />
                            </div>
                        </div>

                        <button type="submit" disabled={isLoading} className="btn-primary w-full text-center flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                            {isLoading ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>) :
                                (<>Create account <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg></>)}
                        </button>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                        <div className="relative flex justify-center"><span className="px-4 text-xs font-medium bg-white text-slate-400">Or continue with</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => handleSocialLogin('Google')} className="btn-glass flex items-center justify-center gap-2 text-sm">
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335" />
                                <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
                                <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05" />
                                <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.2654 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853" />
                            </svg>
                            Google
                        </button>
                        <button type="button" onClick={() => handleSocialLogin('Microsoft')} className="btn-glass flex items-center justify-center gap-2 text-sm">
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <rect x="1" y="1" width="10" height="10" fill="#F25022" /><rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
                                <rect x="1" y="13" width="10" height="10" fill="#00A4EF" /><rect x="13" y="13" width="10" height="10" fill="#FFB900" />
                            </svg>
                            Microsoft
                        </button>
                    </div>

                    <p className="text-center mt-8 text-sm text-slate-400">
                        Already have an account?{' '}
                        <a href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">Sign in</a>
                    </p>

                    {message && (
                        <div className={`mt-4 p-3 rounded-xl text-sm text-center border animate-scale-in
              ${msgType === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                msgType === 'info' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    'bg-red-50 text-red-700 border-red-200'}`}>{msgText}</div>
                    )}
                </div>
            </div>
        </div>
    )
}