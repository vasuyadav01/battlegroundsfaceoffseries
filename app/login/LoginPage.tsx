'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

type LoginMode = 'password' | 'otp' | 'reset'
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
  const [resetSent, setResetSent] = useState(false)
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
      setLoading(false)
      router.push('/dashboard')
    } else {
      setLoading(false)
    }
  }

  // Request Password Reset Link
  async function handleRequestPasswordReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    setResetSent(false)

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setResetSent(true)
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
      setLoading(false)
      router.push('/dashboard')
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className={styles.label} htmlFor="login-password">PASSWORD</label>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#facc15', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                  onClick={() => { setLoginMode('reset'); setError(''); setResetSent(false) }}
                >
                  Forgot Password?
                </button>
              </div>
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

        {/* ── FORM 3: RESET PASSWORD REQUEST ── */}
        {loginMode === 'reset' && (
          <div className={styles.form}>
            {resetSent ? (
              <div style={{
                background: 'rgba(74, 222, 128, 0.1)',
                border: '1px solid #4ade80',
                borderRadius: '8px',
                padding: '1rem',
                color: '#4ade80',
                fontSize: '0.85rem',
                textAlign: 'center'
              }}>
                <p style={{ margin: '0 0 0.5rem', fontWeight: 800 }}>Reset Link Sent! ✉️</p>
                <p style={{ margin: 0, color: '#cccccc', fontSize: '0.8rem' }}>
                  Check your email ({email}) for instructions to set your new password.
                </p>
                <button
                  type="button"
                  style={{ marginTop: '1rem', background: 'transparent', border: '1px solid #4ade80', color: '#4ade80', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                  onClick={() => { setLoginMode('password'); setResetSent(false) }}
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleRequestPasswordReset} className={styles.form}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="reset-email">YOUR ACCOUNT EMAIL</label>
                  <input
                    id="reset-email"
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
                  type="submit"
                  className={styles.submitBtn}
                  disabled={loading}
                >
                  {loading ? <><span className="spinner" /> SENDING RESET LINK...</> : 'SEND RESET LINK →'}
                </button>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#888888', fontSize: '0.8rem', cursor: 'pointer', width: '100%', textAlign: 'center', marginTop: '0.5rem' }}
                  onClick={() => { setLoginMode('password'); setError('') }}
                >
                  ← Back to Password Sign In
                </button>
              </form>
            )}
          </div>
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
