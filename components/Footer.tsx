import Link from 'next/link'
import Image from 'next/image'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerTop}>
          {/* Brand & Organizer Info */}
          <div className={styles.brand}>
            <Image
              src="/images/faceofflogo.png"
              alt="BGFS Faceoff Series"
              width={320}
              height={74}
              className={styles.brandLogo}
              style={{ height: '56px', width: 'auto' }}
            />
            <p className={styles.brandSub}>Battlegrounds Faceoff Series (BGFS) • Season 1</p>
            <p className={styles.brandTagline}>
              Skill-based esports tournament platform for competitive BGMI players.
            </p>
            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#888888', lineHeight: '1.5' }}>
              <p>📍 Operator: Battlegrounds Faceoff Series (BGFS)</p>
              <p>📧 Email: <a href="mailto:battlegroundsfaceoffseries@gmail.com" style={{ color: '#fbbf24' }}>battlegroundsfaceoffseries@gmail.com</a></p>
              <p>📞 Phone: <a href="tel:+918303974916" style={{ color: '#fbbf24' }}>+91 83039 74916</a></p>
            </div>
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
            <p className={styles.groupTitle}>Company</p>
            <Link href="/about" className={styles.footerLink}>About Us</Link>
            <Link href="/contact" className={styles.footerLink}>Contact Support</Link>
            <Link href="/fair-play" className={styles.footerLink}>Fair Play Policy</Link>
          </div>

          {/* Legal Links */}
          <div className={styles.linkGroup}>
            <p className={styles.groupTitle}>Legal &amp; Trust</p>
            <Link href="/terms" className={styles.footerLink}>Terms &amp; Conditions</Link>
            <Link href="/privacy-policy" className={styles.footerLink}>Privacy Policy</Link>
            <Link href="/refund-policy" className={styles.footerLink}>Cancellation &amp; Refund Policy</Link>
            <Link href="/fair-play" className={styles.footerLink}>Skill-Based Gaming</Link>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} Battlegrounds Faceoff Series (BGFS). Skill-based esports tournament platform. Match outcomes are determined entirely by in-game performance, not chance. All game graphics and trademarks belong to Krafton Inc.
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
