export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Navbar from '@/components/Navbar'
import CountdownTimer from '@/components/CountdownTimer'
import { createClient } from '@/lib/supabase/server'
import styles from './page.module.css'

export default async function LandingPage() {
  // Fetch grand finals date from config
  const supabase = await createClient()
  const { data: configRows } = await supabase
    .from('config')
    .select('key, value')
    .in('key', ['grand_finals_date', 'cycle_start_date', 'cycle_end_date'])

  const config: Record<string, string> = {}
  configRows?.forEach(row => { config[row.key] = row.value })

  const grandFinalsDate = config.grand_finals_date || '2025-09-14T18:00:00+05:30'

  return (
    <>
      <Navbar />
      <main>
        {/* ── HERO ── */}
        <section className={styles.hero}>
          <div className={styles.heroBg} />
          <div className={styles.heroGrid} />
          <div className="container">
            <div className={styles.heroContent}>
              <span className="text-label" style={{ color: 'var(--brand-primary)', marginBottom: '1rem', display: 'block' }}>
                ⚡ Season 1 — Now Open
              </span>
              <h1 className={`text-display ${styles.heroTitle}`}>
                Battlegrounds<br />
                <span className="gradient-text">Faceoff Series</span>
              </h1>
              <p className={styles.heroDesc}>
                India's premier BGMI mobile tournament. Compete in weekly league slots,
                climb the leaderboard, and battle your way to the Grand Finals.
              </p>

              <div className={styles.heroCountdown}>
                <CountdownTimer targetDate={grandFinalsDate} />
              </div>

              <div className={styles.heroCta}>
                <Link href="/register" className="btn btn-primary btn-lg">
                  Register Now — ₹50/slot
                </Link>
                <Link href="/leaderboard" className="btn btn-secondary btn-lg">
                  View Leaderboard
                </Link>
              </div>

              <div className={styles.heroStats}>
                <div className={styles.heroStat}>
                  <span className={styles.heroStatVal}>₹270+</span>
                  <span className={styles.heroStatLabel}>Cash per slot</span>
                </div>
                <div className={styles.heroStatDivider} />
                <div className={styles.heroStat}>
                  <span className={styles.heroStatVal}>3</span>
                  <span className={styles.heroStatLabel}>Matches per slot</span>
                </div>
                <div className={styles.heroStatDivider} />
                <div className={styles.heroStat}>
                  <span className={styles.heroStatVal}>16</span>
                  <span className={styles.heroStatLabel}>Teams qualify</span>
                </div>
                <div className={styles.heroStatDivider} />
                <div className={styles.heroStat}>
                  <span className={styles.heroStatVal}>Free</span>
                  <span className={styles.heroStatLabel}>Grand Finals entry</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className={`${styles.howItWorks} section`}>
          <div className="container">
            <h2 className={`section-title text-heading ${styles.sectionCenter}`}>
              How It Works
            </h2>
            <p className={`section-subtitle ${styles.sectionCenter}`}>
              From signup to Grand Finals in 4 simple steps
            </p>

            <div className={styles.stepsGrid}>
              {[
                {
                  step: '01',
                  title: 'Sign Up & Form Your Team',
                  desc: 'Login with your email OTP, create your team, and share the invite code with your squad.',
                  icon: '👥',
                },
                {
                  step: '02',
                  title: 'Book Your Slot',
                  desc: 'Pick a day and time slot. Pay ₹50 entry fee. Your team name appears live on the roster.',
                  icon: '🎯',
                },
                {
                  step: '03',
                  title: 'Play & Grind',
                  desc: '3 matches per slot. Play as many slots as you want. Only your best 16 matches count — no penalty for bad days.',
                  icon: '🔫',
                },
                {
                  step: '04',
                  title: 'Win Prizes & Qualify',
                  desc: 'Top teams in each slot win cash. Top 16 overall qualify for FREE Grand Finals (Sat–Sun).',
                  icon: '🏆',
                },
              ].map((s) => (
                <div key={s.step} className={styles.stepCard}>
                  <div className={styles.stepNum}>{s.step}</div>
                  <div className={styles.stepIcon}>{s.icon}</div>
                  <h3 className={`text-heading ${styles.stepTitle}`}>{s.title}</h3>
                  <p className={styles.stepDesc}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRIZE STRUCTURE ── */}
        <section className={`section ${styles.prizesSection}`}>
          <div className="container">
            <h2 className={`section-title text-heading ${styles.sectionCenter}`}>
              Prizes Every Slot
            </h2>
            <p className={`section-subtitle ${styles.sectionCenter}`}>
              At 18 teams per slot — prizes distributed after every 3-match slot
            </p>

            <div className={styles.prizesGrid}>
              <div className={`${styles.prizeCard} ${styles.prizeGold}`}>
                <div className={styles.prizeMedal}>🥇</div>
                <div className={styles.prizePlace}>1st Place</div>
                <div className={styles.prizeAmount}>₹170</div>
                <div className={styles.prizeType}>Cash via UPI</div>
              </div>
              <div className={`${styles.prizeCard} ${styles.prizeSilver}`}>
                <div className={styles.prizeMedal}>🥈</div>
                <div className={styles.prizePlace}>2nd Place</div>
                <div className={styles.prizeAmount}>₹100</div>
                <div className={styles.prizeType}>Cash via UPI</div>
              </div>
              <div className={`${styles.prizeCard} ${styles.prizeBronze}`}>
                <div className={styles.prizeMedal}>🥉</div>
                <div className={styles.prizePlace}>3rd Place</div>
                <div className={styles.prizeAmount}>Free Slot</div>
                <div className={styles.prizeType}>Next slot entry (₹50 value)</div>
              </div>
            </div>

            <div className={styles.prizeNote}>
              <span>💡</span>
              <p>Top 16 teams overall qualify for the Grand Finals — <strong>no entry fee, completely free.</strong></p>
            </div>
          </div>
        </section>

        {/* ── SCORING FORMAT ── */}
        <section className={`section ${styles.scoringSection}`}>
          <div className="container">
            <div className={styles.scoringInner}>
              <div className={styles.scoringText}>
                <h2 className="text-heading section-title">BGIS-Style Scoring</h2>
                <p className={styles.scoringDesc}>
                  Standard competitive format — 10-point placement system + 1 point per kill.
                  Play unlimited slots. Only your <strong>best 16 match scores</strong> count toward final standings.
                </p>
                <div className={styles.scoringFeatures}>
                  {[
                    '✅ 1st place = 10 points',
                    '✅ Every kill = 1 point',
                    '✅ No cap on slots you can buy',
                    '✅ Best 16 of all matches counted',
                    '✅ Bad matches don\'t hurt your rank',
                  ].map(f => <p key={f} className={styles.scoringFeature}>{f}</p>)}
                </div>
                <Link href="/leaderboard" className="btn btn-secondary" style={{ marginTop: '1.5rem' }}>
                  See Current Standings →
                </Link>
              </div>
              <div className={styles.scoringTable}>
                <h3 className={styles.tableHeading}>Placement Points</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Placement</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['1st', '10'], ['2nd', '6'], ['3rd', '5'], ['4th', '4'],
                      ['5th', '3'], ['6th–10th', '2'], ['11th–15th', '1'], ['16th–24th', '0'],
                    ].map(([p, pts]) => (
                      <tr key={p}>
                        <td>{p}</td>
                        <td><strong style={{ color: 'var(--brand-primary)' }}>{pts}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className={`section ${styles.ctaSection}`}>
          <div className="container">
            <div className={styles.ctaBox}>
              <h2 className={`text-display ${styles.ctaTitle}`}>
                Ready to <span className="gradient-text">Drop In?</span>
              </h2>
              <p className={styles.ctaDesc}>
                Slots fill up fast. Book your spot, grind the leaderboard, and make it to the Grand Finals.
              </p>
              <Link href="/register" className="btn btn-primary btn-lg">
                Book Your Slot — ₹50
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
              <span className="text-display" style={{ fontSize: '1.2rem', background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                BGFS
              </span>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                Battlegrounds Faceoff Series
              </p>
            </div>
            <div className={styles.footerLinks}>
              <Link href="/leaderboard" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Leaderboard</Link>
              <Link href="/register" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Register</Link>
              <Link href="/login" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Login</Link>
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
            © 2025 BGFS. Not affiliated with Krafton or BGMI. This is an independently organised tournament.
          </p>
        </div>
      </footer>
    </>
  )
}
