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
  targetDate: string
  label?: string
}

export default function CountdownTimer({ targetDate, label = 'Grand Finals' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    function calculate() {
      const now = Date.now()
      const target = new Date(targetDate).getTime()
      const diff = target - now

      if (diff <= 0) {
        setIsExpired(true)
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

  if (isExpired) {
    return (
      <div className={styles.wrapper}>
        <p className={styles.liveLabel}>🔴 LIVE NOW</p>
        <p className={styles.expiredText}>{label} is happening!</p>
      </div>
    )
  }

  if (!timeLeft) return null

  const units = [
    { value: timeLeft.days, label: 'Days' },
    { value: timeLeft.hours, label: 'Hours' },
    { value: timeLeft.minutes, label: 'Mins' },
    { value: timeLeft.seconds, label: 'Secs' },
  ]

  return (
    <div className={styles.wrapper}>
      <p className={styles.heading}>{label} starts in</p>
      <div className={styles.units}>
        {units.map((unit, i) => (
          <div key={unit.label} className={styles.unit}>
            <div className={styles.value}>
              {String(unit.value).padStart(2, '0')}
            </div>
            <div className={styles.label}>{unit.label}</div>
            {i < units.length - 1 && <span className={styles.colon}>:</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
