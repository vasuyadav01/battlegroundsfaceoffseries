'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './Navbar.module.css'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    setMenuOpen(false)
  }

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/register', label: 'Register' },
    { href: '/leaderboard', label: 'Leaderboard' },
  ]

  return (
    <nav className={styles.navbar}>
      <div className={`container ${styles.inner}`}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <span className={styles.logoText}>BGFS</span>
          <span className={styles.logoSub}>Battlegrounds Faceoff Series</span>
        </Link>

        {/* Desktop Nav */}
        <div className={styles.links}>
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.link} ${pathname === link.href ? styles.active : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth Buttons */}
        <div className={styles.actions}>
          {user ? (
            <>
              <Link href="/dashboard" className="btn btn-secondary btn-sm">
                Dashboard
              </Link>
              <button onClick={handleSignOut} className="btn btn-ghost btn-sm">
                Sign Out
              </button>
            </>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm">
              Login / Register
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`${styles.bar} ${menuOpen ? styles.barOpen1 : ''}`} />
          <span className={`${styles.bar} ${menuOpen ? styles.barOpen2 : ''}`} />
          <span className={`${styles.bar} ${menuOpen ? styles.barOpen3 : ''}`} />
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={styles.mobileLink}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <hr className="divider" />
          {user ? (
            <>
              <Link href="/dashboard" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
                Dashboard
              </Link>
              <button onClick={handleSignOut} className={styles.mobileLink}>
                Sign Out
              </button>
            </>
          ) : (
            <Link href="/login" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
              Login / Register
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
