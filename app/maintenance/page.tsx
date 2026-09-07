'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShieldAlert, RefreshCw, KeyRound, Wrench, Clock } from 'lucide-react'
import styles from './page.module.css'

export default function MaintenancePage() {
  const [checking, setChecking] = useState(false)

  function handleCheckStatus() {
    setChecking(true)
    setTimeout(() => {
      window.location.href = '/'
    }, 1000)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <Wrench size={38} color="#fbbf24" />
        </div>

        <div className={styles.badgeRow}>
          <span className={styles.statusBadge}>
            <span className={styles.dot} /> UNDER MAINTENANCE
          </span>
        </div>

        <h1 className={styles.title}>
          SCHEDULED SYSTEM UPGRADE IN PROGRESS
        </h1>

        <p className={styles.description}>
          Battlegrounds Faceoff Series is currently undergoing scheduled platform upgrades to optimize match infrastructure, leaderboard point calculation engines, and slot booking performance.
        </p>

        <div className={styles.infoBox}>
          <div className={styles.infoRow}>
            <Clock size={16} color="#fbbf24" />
            <span>Estimated Duration: <strong>15–30 Minutes</strong></span>
          </div>
          <div className={styles.infoRow}>
            <ShieldAlert size={16} color="#4ade80" />
            <span>Your squad data, points, and booked slots are <strong>100% safe</strong>.</span>
          </div>
        </div>

        <div className={styles.actionsRow}>
          <button
            type="button"
            className={styles.checkBtn}
            onClick={handleCheckStatus}
            disabled={checking}
          >
            <RefreshCw size={16} className={checking ? styles.spin : ''} />
            <span>{checking ? 'Checking Status...' : 'Check Status Again'}</span>
          </button>

          <Link href="/login?redirectTo=/admin" className={styles.adminBtn}>
            <KeyRound size={15} />
            <span>Admin Login Portal</span>
          </Link>
        </div>

        <p className={styles.footerNote}>
          Thank you for your patience while we build a better esports experience!
        </p>
      </div>
    </div>
  )
}
