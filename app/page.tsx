export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import CountdownTimer from '@/components/CountdownTimer'
import { createClient } from '@/lib/supabase/server'
import styles from './page.module.css'

export default async function LandingPage() {
  // Fetch grand finals date from config (fallback to August 29, 11:00 PM IST)
  const supabase = await createClient()
  const { data: configRows } = await supabase
    .from('config')
    .select('key, value')
    .in('key', ['grand_finals_date', 'cycle_start_date', 'cycle_end_date'])

  const config: Record<string, string> = {}
  configRows?.forEach(row => { config[row.key] = row.value })

  const grandFinalsDate = '2026-08-29T23:00:00+05:30'

  return (
    <>
      <Navbar />
      <main>
        {/* ── HERO ── */}
        <section className={styles.hero}>
          <div className={styles.heroOverlay} />
          <div className={styles.heroGrid} />
          <div className={styles.heroContainer}>
            <div className={styles.heroContent}>
              {/* Logo above heading */}
              <div className={styles.heroLogoWrapper}>
                <Image
                  src="/images/faceofflogo.png"
                  alt="BGFS Faceoff Series"
                  width={720}
                  height={240}
                  className={styles.heroLogoImg}
                  priority
                />
              </div>

              <h1 className={styles.heroTitle}>
                BATTLEGROUNDS<br />
                <span className={styles.goldText}>FACEOFF SERIES</span>
              </h1>
              <p className={styles.heroDesc}>
                India's first unofficial competitive league for players who live for BGMI. Compete from home, chase the Season 1 trophy and fight your way into the top 16 for a free ticket to the Grand Finals.
              </p>

              {/* Countdown timer block */}
              <CountdownTimer targetDate={grandFinalsDate} />

              {/* Action buttons */}
              <div className={styles.heroCta}>
                <Link href="/register" className={styles.primaryCta}>
                  REGISTER NOW
                </Link>
                <Link href="/leaderboard" className={styles.secondaryCta}>
                  VIEW LEADERBOARD
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className={styles.howItWorks}>
          <div className="container">
            <div className={styles.sectionCenter}>
              <h2 className={styles.sectionTitle}>
                ROAD TO GRAND FINALS
              </h2>
              <p className={styles.sectionSubtitle}>
                Four seamless steps from signup to championship glory
              </p>
            </div>

            <div className={styles.stepsGrid}>
              {[
                {
                  num: '01',
                  step: 'STEP 01',
                  title: 'SIGN UP & SQUAD UP',
                  desc: 'Log in via secure email OTP, create your roster, and invite your teammates.',
                  icon: '👥',
                },
                {
                  num: '02',
                  step: 'STEP 02',
                  title: 'BOOK LEAGUE SLOTS',
                  desc: 'Select preferred daily match slots. Instant slot confirmation after ₹50 checkout.',
                  icon: '🎯',
                },
                {
                  num: '03',
                  step: 'STEP 03',
                  title: 'GRIND & DOMINATE',
                  desc: '3 matches per slot. Play as many slots as you want — only your top 16 match scores count.',
                  icon: '🔫',
                },
                {
                  num: '04',
                  step: 'STEP 04',
                  title: 'WIN CASH & QUALIFY',
                  desc: 'Instant UPI payouts after every slot. Top 16 overall teams advance to FREE Grand Finals.',
                  icon: '🏆',
                },
              ].map((s) => (
                <div key={s.step} className={styles.stepCard}>
                  <div className={styles.stepBgNum}>{s.num}</div>
                  <div className={styles.stepNum}>{s.step}</div>
                  <div className={styles.stepIcon}>{s.icon}</div>
                  <h3 className={styles.stepTitle}>{s.title}</h3>
                  <p className={styles.stepDesc}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRIZE STRUCTURE ── */}
        <section className={styles.prizesSection}>
          <div className="container">
            <div className={styles.sectionCenter}>
              <h2 className={styles.sectionTitle}>
                SLOT PRIZE POOL
              </h2>
              <p className={styles.sectionSubtitle}>
                Guaranteed cash payouts after every 3-match slot completion
              </p>
            </div>

            <div className={styles.prizesGrid}>
              <div className={`${styles.prizeCard} ${styles.prizeGold}`}>
                <div className={styles.prizeMedal}>🥇</div>
                <div className={styles.prizePlace}>1ST PLACE</div>
                <div className={styles.prizeAmount}>₹170</div>
                <div className={styles.prizeType}>INSTANT UPI CASH</div>
              </div>
              <div className={`${styles.prizeCard} ${styles.prizeSilver}`}>
                <div className={styles.prizeMedal}>🥈</div>
                <div className={styles.prizePlace}>2ND PLACE</div>
                <div className={styles.prizeAmount}>₹100</div>
                <div className={styles.prizeType}>INSTANT UPI CASH</div>
              </div>
              <div className={`${styles.prizeCard} ${styles.prizeBronze}`}>
                <div className={styles.prizeMedal}>🥉</div>
                <div className={styles.prizePlace}>3RD PLACE</div>
                <div className={styles.prizeAmount}>FREE SLOT</div>
                <div className={styles.prizeType}>NEXT SLOT PASS (₹50 VALUE)</div>
              </div>
            </div>

            <div className={styles.prizeNote}>
              <span>⚡</span>
              <p>Top 16 teams overall qualify for the Grand Finals — <strong>zero entry fee, 100% free qualification.</strong></p>
            </div>
          </div>
        </section>

        {/* ── SCORING FORMAT ── */}
        <section className={styles.scoringSection}>
          <div className="container">
            <div className={styles.scoringInner}>
              <div>
                <h2 className={styles.sectionTitle}>BGIS SCORING SYSTEM</h2>
                <p className={styles.scoringDesc}>
                  Official esports placement point system + 1 finish point per kill. Play unlimited slots without punishment — our system automatically aggregates your <strong>Best 16 match performances</strong>.
                </p>
                <div className={styles.scoringFeatures}>
                  {[
                    '✓ 1st Place = 10 Placement Points',
                    '✓ 1 Finish = 1 Point',
                    '✓ Unlimited Slot Re-entry allowed',
                    '✓ Best 16 match score auto-calculation',
                    '✓ Off-days do not hurt your overall rank',
                  ].map(f => <p key={f} className={styles.scoringFeature}>{f}</p>)}
                </div>
                <Link href="/leaderboard" className={styles.secondaryCta} style={{ display: 'inline-block', marginTop: '1.5rem' }}>
                  VIEW STANDINGS →
                </Link>
              </div>
              <div className={styles.scoringTable}>
                <h3 className={styles.tableHeading}>Placement Point Table</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Placement</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['1st Place', '10 Pts'], ['2nd Place', '6 Pts'], ['3rd Place', '5 Pts'], ['4th Place', '4 Pts'],
                      ['5th Place', '3 Pts'], ['6th–10th', '2 Pts'], ['11th–15th', '1 Pt'], ['16th–24th', '0 Pts'],
                    ].map(([p, pts]) => (
                      <tr key={p}>
                        <td>{p}</td>
                        <td style={{ color: '#fbbf24', fontWeight: '800' }}>{pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className={styles.ctaSection}>
          <div className="container">
            <div className={styles.ctaBox}>
              <h2 className={styles.ctaTitle}>
                READY TO <span className={styles.goldText}>CLAIM YOUR SLOT?</span>
              </h2>
              <p className={styles.ctaDesc}>
                Limited 18 teams per slot. Secure your spot now and start grinding toward the Grand Finals.
              </p>
              <Link href="/register" className={styles.primaryCta}>
                BOOK SLOT NOW — ₹50
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <div className="container">
          <div className={styles.footerInner}>
            <div>
              <span className={styles.goldText} style={{ fontFamily: 'Inter', fontSize: '1.3rem', fontWeight: '900', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                BGFS FACEOFF
              </span>
              <p style={{ color: '#777777', fontSize: '0.8rem', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Battlegrounds Faceoff Series • Season 1
              </p>
            </div>
            <div className={styles.footerLinks}>
              <Link href="/leaderboard" style={{ color: '#b8b8b8', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>Leaderboard</Link>
              <Link href="/register" style={{ color: '#b8b8b8', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>Book Slot</Link>
              <Link href="/login" style={{ color: '#b8b8b8', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>Login</Link>
            </div>
          </div>
          <p style={{ color: '#777777', fontSize: '0.75rem', textAlign: 'center', marginTop: '2rem', borderTop: '1px solid #212121', paddingTop: '1.25rem' }}>
            © 2025 BGFS. Independent competitive gaming platform. All game graphics and trademarks belong to Krafton.
          </p>
        </div>
      </footer>
    </>
  )
}
