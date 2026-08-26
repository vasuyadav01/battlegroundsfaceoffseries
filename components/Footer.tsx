import Link from 'next/link'
import Image from 'next/image'
import { Lock, Zap } from 'lucide-react'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerTop}>
          {/* Brand Column */}
          <div className={styles.brand}>
            <Image
              src="/images/faceofflogo.png"
              alt="BGFS Faceoff Series"
              width={260}
              height={56}
              className={styles.brandLogo}
              style={{ height: '48px', width: 'auto' }}
            />
            <p className={styles.brandSub}>Battlegrounds Faceoff Series (BGFS) • Season 1</p>
            <p className={styles.brandTagline}>
              Skill-based esports tournament platform for competitive BGMI players.
            </p>
          </div>

          {/* Quick Links */}
          <div className={styles.linkGroup}>
            <p className={styles.groupTitle}>PLATFORM</p>
            <Link href="/" className={styles.footerLink}>Home</Link>
            <Link href="/leaderboard" className={styles.footerLink}>Leaderboard</Link>
            <Link href="/slots" className={styles.footerLink}>Register for Slot</Link>
            <Link href="/pricing" className={styles.footerLink}>Pricing</Link>
          </div>

          {/* Info Links */}
          <div className={styles.linkGroup}>
            <p className={styles.groupTitle}>COMPANY</p>
            <Link href="/about" className={styles.footerLink}>About Us</Link>
            <Link href="/contact" className={styles.footerLink}>Contact Support</Link>
            <Link href="/fair-play" className={styles.footerLink}>Fair Play Policy</Link>
          </div>

          {/* Legal Links & Trust Badges */}
          <div className={styles.linkGroup}>
            <p className={styles.groupTitle}>LEGAL &amp; TRUST</p>
            <Link href="/terms" className={styles.footerLink}>Terms &amp; Conditions</Link>
            <Link href="/privacy-policy" className={styles.footerLink}>Privacy Policy</Link>
            <Link href="/refund-policy" className={styles.footerLink}>Cancellation &amp; Refund Policy</Link>
            <Link href="/fair-play" className={styles.footerLink}>Skill-Based Gaming</Link>

            <div className={styles.trustBadges}>
              <span className={styles.trustChip}>
                <Lock size={11} color="#fbbf24" /> SSL SECURED
              </span>
              <span className={styles.trustChip}>
                <Zap size={11} color="#fbbf24" /> RAZORPAY
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={styles.footerBottom}>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} Battlegrounds Faceoff Series (BGFS). Skill-based esports tournament platform. Match outcomes are determined entirely by in-game performance, not chance.
          </p>
          <div className={styles.legalLinks}>
            <Link href="/terms" className={styles.legalLink}>Terms</Link>
            <span className={styles.dot}>·</span>
            <Link href="/privacy-policy" className={styles.legalLink}>Privacy</Link>
            <span className={styles.dot}>·</span>
            <Link href="/refund-policy" className={styles.legalLink}>Refunds</Link>
            <span className={styles.dot}>·</span>
            <Link href="/fair-play" className={styles.legalLink}>Fair Play</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
