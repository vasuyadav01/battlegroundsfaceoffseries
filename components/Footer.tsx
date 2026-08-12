import Link from 'next/link'
import Image from 'next/image'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerTop}>
          {/* Brand */}
          <div className={styles.brand}>
            <Image
              src="/images/faceofflogo.png"
              alt="BGFS Faceoff Series"
              width={320}
              height={74}
              className={styles.brandLogo}
              style={{ height: '64px', width: 'auto' }}
            />
            <p className={styles.brandSub}>Battlegrounds Faceoff Series • Season 1</p>
            <p className={styles.brandTagline}>
              India's premier BGMI mobile tournament platform.
            </p>
          </div>

          {/* Quick Links */}
          <div className={styles.linkGroup}>
            <p className={styles.groupTitle}>Platform</p>
            <Link href="/" className={styles.footerLink}>Home</Link>
            <Link href="/leaderboard" className={styles.footerLink}>Leaderboard</Link>
            <Link href="/slots" className={styles.footerLink}>Book a Slot</Link>
            <Link href="/pricing" className={styles.footerLink}>Pricing</Link>
          </div>

          {/* Info Links */}
          <div className={styles.linkGroup}>
            <p className={styles.groupTitle}>Info</p>
            <Link href="/about" className={styles.footerLink}>About Us</Link>
            <Link href="/contact" className={styles.footerLink}>Contact Us</Link>
          </div>

          {/* Legal Links */}
          <div className={styles.linkGroup}>
            <p className={styles.groupTitle}>Legal</p>
            <Link href="/terms" className={styles.footerLink}>Terms &amp; Conditions</Link>
            <Link href="/privacy-policy" className={styles.footerLink}>Privacy Policy</Link>
            <Link href="/refund-policy" className={styles.footerLink}>Cancellation &amp; Refund Policy</Link>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} BGFS. Independent competitive gaming platform. All game graphics and trademarks belong to Krafton.
          </p>
          <div className={styles.legalLinks}>
            <Link href="/terms" className={styles.legalLink}>Terms</Link>
            <span className={styles.dot}>·</span>
            <Link href="/privacy-policy" className={styles.legalLink}>Privacy</Link>
            <span className={styles.dot}>·</span>
            <Link href="/refund-policy" className={styles.legalLink}>Refunds</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
