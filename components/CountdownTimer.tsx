'use client'

import { useEffect, useState } from 'react'
import styles from './CountdownTimer.module.css'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

interface CountdownTimerProps {
  targetDate?: string
  label?: string
}

export default function CountdownTimer({
  targetDate = '2026-08-29T23:00:00+05:30',
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)

  useEffect(() => {
    function calculate() {
      const target = new Date(targetDate).getTime()
      const now = Date.now()
      const diff = target - now

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }

    calculate()
    const interval = setInterval(calculate, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  if (!timeLeft) {
    return (
      <div className={styles.container}>
        {[
          { label: 'DAYS', val: '00' },
          { label: 'HOURS', val: '00' },
          { label: 'MINUTES', val: '00' },
          { label: 'SECONDS', val: '00' },
        ].map((u) => (
          <div key={u.label} className={styles.box}>
            <span className={styles.num}>{u.val}</span>
            <span className={styles.unitLabel}>{u.label}</span>
          </div>
        ))}
      </div>
    )
  }

  const units = [
    { label: 'DAYS', value: timeLeft.days },
    { label: 'HOURS', value: timeLeft.hours },
    { label: 'MINUTES', value: timeLeft.minutes },
    { label: 'SECONDS', value: timeLeft.seconds },
  ]

  return (
    <div className={styles.container}>
      {units.map((u) => (
        <div key={u.label} className={styles.box}>
          <span className={styles.num}>
            {String(u.value).padStart(2, '0')}
          </span>
          <span className={styles.unitLabel}>{u.label}</span>
        </div>
      ))}
    </div>
  )
}
