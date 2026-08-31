'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, KeyRound, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import styles from '../login/page.module.css'

export default function ResetPasswordClient() {
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const { error: updateErr } = await supabase.auth.updateUser({
      password: password,
    })

    setLoading(false)

    if (updateErr) {
      setError(updateErr.message)
      return
    }

    setSuccess(true)
    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/login" className={styles.backLink}>
          <ArrowLeft size={16} />
          <span>Back to Sign In</span>
        </Link>
      </div>

      <div className={styles.card}>
        <div className={styles.headerArea}>
          <span className={styles.brandTag}>BGMI FACEOFF SERIES</span>
          <h1 className={styles.title}>SET NEW PASSWORD</h1>
          <p className={styles.subtitle}>
            Enter your new secure password below to update your account.
          </p>
        </div>

        {success ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem 1rem',
            background: 'rgba(74, 222, 128, 0.1)',
            border: '1px solid #4ade80',
            borderRadius: '8px',
            color: '#4ade80',
          }}>
            <Check size={32} style={{ margin: '0 auto 0.75rem', display: 'block' }} />
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 800 }}>Password Updated Successfully!</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#cccccc' }}>
              Redirecting you to your dashboard...
            </p>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className={styles.form}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="new-password">NEW PASSWORD</label>
              <input
                id="new-password"
                type="password"
                className={styles.input}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={6}
                required
                autoFocus
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="confirm-password">CONFIRM NEW PASSWORD</label>
              <input
                id="confirm-password"
                type="password"
                className={styles.input}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            {error && <p className={styles.errorMsg}>{error}</p>}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? <><span className="spinner" /> UPDATING PASSWORD...</> : 'UPDATE PASSWORD →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
