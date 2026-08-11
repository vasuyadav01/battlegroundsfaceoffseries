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
          <span className={styles.logoBadge}>BGFS</span>
          <span className={styles.logoText}>FACEOFF</span>
        </div>

        <h1 className={styles.title}>
          {step === 'email' ? 'SIGN IN' : 'ENTER OTP'}
        </h1>
        <p className={styles.subtitle}>
          {step === 'email'
            ? 'Enter your registered email address to receive your 6-digit access code.'
            : `Verification code sent to ${email}. Check your inbox.`}
        </p>

        {step === 'email' && (
          <form onSubmit={handleSendOtp} className={styles.form}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">EMAIL ADDRESS</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="player@bgfsesports.com"
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
              style={{ width: '100%', background: '#fbbf24', color: '#111111', fontWeight: '800', textTransform: 'uppercase', padding: '12px' }}
              disabled={loading}
            >
              {loading ? <><span className="spinner" /> SENDING CODE...</> : 'SEND OTP CODE →'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className={styles.form}>
            <div className="form-group">
              <label className="form-label" htmlFor="otp">6-DIGIT VERIFICATION CODE</label>
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
              style={{ width: '100%', background: '#fbbf24', color: '#111111', fontWeight: '800', textTransform: 'uppercase', padding: '12px' }}
              disabled={loading || otp.length < 6}
            >
              {loading ? <><span className="spinner" /> VERIFYING...</> : 'VERIFY & SIGN IN'}
            </button>

            <div className={styles.resendRow}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => { setStep('email'); setOtp(''); setError('') }}
                style={{ color: '#b8b8b8', fontSize: '0.8rem', textTransform: 'uppercase' }}
              >
                ← CHANGE EMAIL
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={resendCooldown > 0}
                onClick={handleSendOtp as any}
                style={{ color: '#fbbf24', fontSize: '0.8rem', textTransform: 'uppercase' }}
              >
                {resendCooldown > 0 ? `RESEND IN ${resendCooldown}S` : 'RESEND OTP'}
              </button>
            </div>
          </form>
        )}

        <p className={styles.terms}>
          By signing in, you agree to the tournament rules and guidelines.<br />
          <Link href="/">← BACK TO HOME</Link>
        </p>
      </div>
    </div>
  )
}
