'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

type LoginMode = 'password' | 'otp'
type OtpStep = 'email' | 'otp'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loginMode, setLoginMode] = useState<LoginMode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpStep, setOtpStep] = useState<OtpStep>('email')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  // Standard Password Sign In
  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
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

      setLoading(false)
      if (!userRow?.team_id) {
        router.push('/onboard')
      } else {
        router.push('/dashboard')
      }
    } else {
      setLoading(false)
    }
  }

  // OTP Request
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setOtpStep('otp')
    setResendCooldown(60)
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  // OTP Verification
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
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

      setLoading(false)
      if (!userRow?.team_id) {
        router.push('/onboard')
      } else {
        router.push('/dashboard')
      }
    } else {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* Top Left Back Button */}
      <div className={styles.topBar}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </Link>
      </div>

      <div className={styles.card}>
        <div className={styles.headerArea}>
          <span className={styles.brandTag}>BGMI FACEOFF SERIES</span>
          <h1 className={styles.title}>SIGN IN</h1>
          <p className={styles.subtitle}>
            Access your BGFS portal, slot bookings, &amp; standings.
          </p>
        </div>

        {/* Segmented Tab Switcher */}
        <div className={styles.modeTabs}>
          <button
            type="button"
            className={`${styles.modeBtn} ${loginMode === 'password' ? styles.modeBtnActive : ''}`}
            onClick={() => { setLoginMode('password'); setError('') }}
          >
            PASSWORD
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${loginMode === 'otp' ? styles.modeBtnActive : ''}`}
            onClick={() => { setLoginMode('otp'); setError('') }}
          >
            OTP CODE
          </button>
        </div>

        {/* ── FORM 1: STANDARD ID & PASSWORD ── */}
        {loginMode === 'password' && (
          <form onSubmit={handlePasswordSignIn} className={styles.form}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="login-email">EMAIL ADDRESS</label>
              <input
                id="login-email"
                type="email"
                className={styles.input}
                placeholder="player@bgfsesports.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="login-password">PASSWORD</label>
              <input
                id="login-password"
                type="password"
                className={styles.input}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className={styles.errorMsg}>{error}</p>}

            <button
              id="password-signin-btn"
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? <><span className="spinner" /> SIGNING IN...</> : 'SIGN IN →'}
            </button>
          </form>
        )}

        {/* ── FORM 2: OTP SIGN IN ── */}
        {loginMode === 'otp' && (
          <>
            {otpStep === 'email' && (
              <form onSubmit={handleSendOtp} className={styles.form}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="otp-email">EMAIL ADDRESS</label>
                  <input
                    id="otp-email"
                    type="email"
                    className={styles.input}
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
                  className={styles.submitBtn}
                  disabled={loading}
                >
                  {loading ? <><span className="spinner" /> SENDING CODE...</> : 'SEND OTP CODE →'}
                </button>
              </form>
            )}

            {otpStep === 'otp' && (
              <form onSubmit={handleVerifyOtp} className={styles.form}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="otp-input">6-DIGIT VERIFICATION CODE</label>
                  <input
                    id="otp-input"
                    type="text"
                    className={`${styles.input} ${styles.otpInput}`}
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
                  className={styles.submitBtn}
                  disabled={loading || otp.length < 6}
                >
                  {loading ? <><span className="spinner" /> VERIFYING...</> : 'VERIFY & SIGN IN'}
                </button>

                <div className={styles.resendRow}>
                  <button
                    type="button"
                    className={styles.resendBtn}
                    onClick={() => { setOtpStep('email'); setOtp(''); setError('') }}
                  >
                    ← CHANGE EMAIL
                  </button>
                  <button
                    type="button"
                    className={`${styles.resendBtn} ${styles.resendBtnGold}`}
                    disabled={resendCooldown > 0}
                    onClick={handleSendOtp as any}
                  >
                    {resendCooldown > 0 ? `RESEND IN ${resendCooldown}S` : 'RESEND OTP'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* New User Option Section */}
        <div className={styles.signupFooter}>
          <p className={styles.signupText}>Don't have an account yet?</p>
          <Link href="/register" className={styles.signupLink}>
            CREATE ACCOUNT / REGISTER NOW →
          </Link>
        </div>
      </div>
    </div>
  )
}
