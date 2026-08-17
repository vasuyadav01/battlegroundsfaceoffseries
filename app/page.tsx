export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Image from 'next/image'
import { Users, Calendar, Crosshair, Trophy, Medal, Award, Zap, Check, ArrowRight, ShieldCheck } from 'lucide-react'
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
                India's skill-based competitive esports league for BGMI mobile players. Compete from home, grind the Season 1 leaderboard, and fight your way into the top 16 for a free ticket to the Grand Finals.
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
                Four structured steps from signup to championship glory
              </p>
            </div>

            <div className={styles.stepsGrid}>
              {[
                {
                  num: '01',
                  step: 'STEP 01',
                  title: 'SIGN UP & SQUAD UP',
                  desc: 'Log in via secure email OTP, create your roster, and invite your teammates.',
                  Icon: Users,
                },
                {
                  num: '02',
                  step: 'STEP 02',
                  title: 'BOOK LEAGUE SLOTS',
                  desc: 'Select preferred daily match slots with instant slot confirmation.',
                  Icon: Calendar,
                },
                {
                  num: '03',
                  step: 'STEP 03',
                  title: 'GRIND & DOMINATE',
                  desc: '3 matches per slot. Play as many slots as you want — only your top 16 match scores count.',
                  Icon: Crosshair,
                },
                {
                  num: '04',
                  step: 'STEP 04',
                  title: 'WIN PRIZES & QUALIFY',
                  desc: 'Instant UPI prize payouts after every slot. Top 16 overall teams advance to FREE Grand Finals.',
                  Icon: Trophy,
                },
              ].map((s) => (
                <div key={s.step} className={styles.stepCard}>
                  <div className={styles.stepBgNum}>{s.num}</div>
                  <div className={styles.stepHeader}>
                    <s.Icon className={styles.stepIconLucide} size={20} color="#facc15" strokeWidth={2} />
                    <span className={styles.stepNum}>{s.step}</span>
                  </div>
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
                Guaranteed tournament rewards after every 3-match slot completion
              </p>
            </div>

            <div className={styles.prizesGrid}>
              <div className={`${styles.prizeCard} ${styles.prizeGold}`}>
                <div className={styles.prizeMedal}>
                  <Trophy size={36} color="#facc15" strokeWidth={1.75} />
                </div>
                <div className={styles.prizePlace}>1ST PLACE</div>
                <div className={styles.prizeAmount}>₹170</div>
                <div className={styles.prizeType}>INSTANT UPI REWARD</div>
              </div>
              <div className={`${styles.prizeCard} ${styles.prizeSilver}`}>
                <div className={styles.prizeMedal}>
                  <Medal size={36} color="#c0c0c0" strokeWidth={1.75} />
                </div>
                <div className={styles.prizePlace}>2ND PLACE</div>
                <div className={styles.prizeAmount}>₹100</div>
                <div className={styles.prizeType}>INSTANT UPI REWARD</div>
              </div>
              <div className={`${styles.prizeCard} ${styles.prizeBronze}`}>
                <div className={styles.prizeMedal}>
                  <Award size={36} color="#cd7f32" strokeWidth={1.75} />
                </div>
                <div className={styles.prizePlace}>3RD PLACE</div>
                <div className={styles.prizeAmount}>FREE SLOT</div>
                <div className={styles.prizeType}>NEXT SLOT PASS</div>
              </div>
            </div>

            <div className={styles.prizeNote}>
              <Zap size={20} color="#facc15" style={{ flexShrink: 0 }} />
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
                    '1st Place = 10 Placement Points',
                    '1 Finish = 1 Point',
                    'Unlimited Slot Re-entry allowed',
                    'Best 16 match score auto-calculation',
                    'Off-days do not hurt your overall rank',
                  ].map(f => (
                    <div key={f} className={styles.scoringFeature}>
                      <Check size={16} color="#facc15" style={{ flexShrink: 0 }} />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <Link href="/leaderboard" className={styles.secondaryCta} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                  <span>VIEW STANDINGS</span>
                  <ArrowRight size={16} />
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

        {/* ── SKILL-BASED GAMING DISCLAIMER BANNER ── */}
        <section className={styles.skillSection}>
          <div className="container">
            <div className={styles.skillCard}>
              <ShieldCheck size={32} color="#fbbf24" style={{ flexShrink: 0 }} />
              <div>
                <h3 className={styles.skillTitle}>Skill-Based Esports Tournament Platform</h3>
                <p className={styles.skillText}>
                  BGFS is a skill-based competitive gaming platform. Results are determined entirely by player skill, in-game performance, tactical strategy, kills, and placement points — not chance.
                </p>
              </div>
              <Link href="/fair-play" className={styles.fairPlayBtn}>
                Fair Play Policy →
              </Link>
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
              <Link href="/slots" className={styles.primaryCta}>
                BOOK YOUR SLOT
              </Link>
            </div>
          </div>
        </section>
    </main>
  )
}
