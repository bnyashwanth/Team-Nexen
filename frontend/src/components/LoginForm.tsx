'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api'
import Logo from '@/components/Logo'

export default function LoginForm() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const result = await apiClient.login(formData)
      if (result.error) {
        setMessage(`error:${result.error}`)
      } else if (result.data?.user) {
        setMessage('success:Login successful! Redirecting...')
        setTimeout(() => { window.location.href = '/dashboard' }, 1000)
      }
    } catch {
      setMessage('error:Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = (provider: string) => {
    setMessage(`info:Demo: Redirecting to ${provider} authentication...`)
  }

  const msgType = message.split(':')[0]
  const msgText = message.substring(message.indexOf(':') + 1)

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>

      {/* Left Panel — Brand */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #312e81 0%, #4338ca 40%, #6366f1 100%)' }}>

        {/* Floating Orbs */}
        <div className="absolute w-72 h-72 rounded-full animate-float"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08), transparent)', top: '10%', left: '10%' }} />
        <div className="absolute w-96 h-96 rounded-full animate-float"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.05), transparent)', bottom: '5%', right: '5%', animationDelay: '1.5s' }} />
        <div className="absolute w-48 h-48 rounded-full animate-float"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.06), transparent)', top: '50%', right: '20%', animationDelay: '3s' }} />

        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />

        {/* Content */}
        <div className="relative z-10 text-center px-12 animate-fade-in">
          <div className="mb-8">
            <Logo size="xl" className="mx-auto mb-6" />
          </div>
          <h1 className="text-4xl font-bold mb-4 text-white">Nexen</h1>
          <p className="text-lg mb-2 text-indigo-100">Supply Chain Intelligence Platform</p>
          <p className="text-sm max-w-sm mx-auto text-indigo-200/80">
            Real-time monitoring, AI-powered analytics, and operational insights for your logistics network.
          </p>

          <div className="mt-12 space-y-4 text-left max-w-xs mx-auto">
            {[
              { icon: '📊', text: 'Real-time Metric Trees' },
              { icon: '🤖', text: 'AI-Powered Analysis' },
              { icon: '⚡', text: 'ML Score Predictions' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${(i + 1) * 200}ms` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  {f.icon}
                </div>
                <span className="text-sm font-medium text-indigo-100">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-full max-w-md mx-auto animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Logo size="lg" className="mx-auto mb-2" />
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Supply Chain Intelligence</p>
          </div>

          <div className="mb-8">
            <h2 className="text-headline text-slate-800">Welcome back</h2>
            <p className="mt-2 text-body text-slate-400">Sign in to your account to continue</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-caption font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Email address
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <input id="email" name="email" type="email" autoComplete="email" required
                  className="input-light w-full pl-12" placeholder="Enter your email address"
                  value={formData.email} onChange={handleChange} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-caption font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Password
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </div>
                <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required
                  className="input-light w-full pl-12 pr-12" placeholder="Enter your password"
                  value={formData.password} onChange={handleChange} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--text-muted)' }}>
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: 'var(--accent-primary)', borderColor: 'var(--border-medium)' }} />
                <span className="text-body" style={{ color: 'var(--text-secondary)' }}>Remember me</span>
              </label>
              <a href="#" className="text-body font-medium hover:opacity-80 transition-opacity" style={{ color: 'var(--accent-primary)' }}>
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="btn-primary w-full text-center flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
              ) : (
                <>Sign in <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg></>
              )}
            </button>
          </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t" style={{ borderColor: 'var(--border-subtle)' }} /></div>
              <div className="relative flex justify-center">
                <span className="px-4 text-caption font-medium" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>Or continue with</span>
              </div>
            </div>

          {/* Social */}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => handleSocialLogin('Google')}
              className="btn-glass flex items-center justify-center gap-2 text-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335" />
                <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
                <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05" />
                <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.2654 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853" />
              </svg>
              Google
            </button>
            <button type="button" onClick={() => handleSocialLogin('Microsoft')}
              className="btn-glass flex items-center justify-center gap-2 text-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <rect x="1" y="1" width="10" height="10" fill="#F25022" />
                <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
                <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
                <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
              </svg>
              Microsoft
            </button>
          </div>

          <p className="text-center mt-8 text-body" style={{ color: 'var(--text-muted)' }}>
            Don&apos;t have an account?{' '}
            <a href="/signup" className="font-semibold hover:opacity-80 transition-opacity" style={{ color: 'var(--accent-primary)' }}>Create account</a>
          </p>

          {message && (
            <div className={`mt-4 p-3 rounded-xl text-sm text-center border animate-scale-in
              ${msgType === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                msgType === 'info' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  'bg-red-50 text-red-700 border-red-200'}`}>
              {msgText}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}