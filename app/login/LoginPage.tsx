'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

type Step = 'email' | 'otp'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setStep('otp')
    setResendCooldown(60)
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    })

    if (error) {
      setLoading(false)
      setError(error.message)
      return
    }

    const userId = data.user?.id
    if (userId) {
      const { data: userRow } = await supabase
        .from('users')
        .select('team_id')
        .eq('user_id', userId)
        .single()

      if (!userRow?.team_id) {
        router.push('/onboard')
      } else {
        router.push('/dashboard')
      }
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} />
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoText}>BGFS</span>
          <span className={styles.logoSub}>Battlegrounds Faceoff Series</span>
        </div>

        <h1 className={styles.title}>
          {step === 'email' ? 'Sign In' : 'Enter OTP'}
        </h1>
        <p className={styles.subtitle}>
          {step === 'email'
            ? 'We\'ll send a one-time code to your email — no password needed.'
            : `We sent a 6-digit code to ${email}. Check your inbox.`}
        </p>

        {step === 'email' && (
          <form onSubmit={handleSendOtp} className={styles.form}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            {error && <p className={styles.errorMsg}>{error}</p>}
            <button
              id="send-otp-btn"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? <><span className="spinner" /> Sending...</> : 'Send OTP →'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className={styles.form}>
            <div className="form-group">
              <label className="form-label" htmlFor="otp">6-digit code</label>
              <input
                id="otp"
                type="text"
                className={`form-input ${styles.otpInput}`}
                placeholder="000000"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                maxLength={6}
                required
                autoFocus
              />
            </div>
            {error && <p className={styles.errorMsg}>{error}</p>}
            <button
              id="verify-otp-btn"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={loading || otp.length < 6}
            >
              {loading ? <><span className="spinner" /> Verifying...</> : 'Verify & Sign In'}
            </button>

            <div className={styles.resendRow}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => { setStep('email'); setOtp(''); setError('') }}
              >
                ← Change email
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={resendCooldown > 0}
                onClick={handleSendOtp as any}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}

        <p className={styles.terms}>
          By signing in, you agree to participate in BGFS tournament matches.<br />
          <Link href="/">← Back to home</Link>
        </p>
      </div>
    </div>
  )
}
