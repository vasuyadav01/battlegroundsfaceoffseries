'use client'

import { useState, useMemo } from 'react'
import styles from './page.module.css'

interface LeaderboardRow {
  team_id: string
  team_name: string
  matches_played: number
  best_16_total: number
  total_kills: number
  rank: number
}

interface MatchEntry {
  team_id: string
  slot_id: string
  match_number: number
  total_points: number
  placement: number
  kills: number
  slots: { date: string; time_label: string } | null
}

interface Props {
  rows: LeaderboardRow[]
  allMatches: MatchEntry[]
}

export default function LeaderboardClient({ rows, allMatches }: Props) {
  const [search, setSearch] = useState('')
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)

  const filtered = useMemo(() =>
    rows.filter(r => r.team_name.toLowerCase().includes(search.toLowerCase())),
    [rows, search]
  )

  // Build per-team match list
  const teamMatches = useMemo(() => {
    const map: Record<string, MatchEntry[]> = {}
    allMatches.forEach(m => {
      if (!map[m.team_id]) map[m.team_id] = []
      map[m.team_id].push(m)
    })
    return map
  }, [allMatches])

  function getRankBadgeClass(rank: number) {
    if (rank === 1) return 'badge-gold'
    if (rank === 2) return 'badge-silver'
    if (rank === 3) return 'badge-bronze'
    return 'badge-neutral'
  }

  function getRowRankClass(rank: number) {
    if (rank === 1) return styles.rank1
    if (rank === 2) return styles.rank2
    if (rank === 3) return styles.rank3
    if (rank <= 16) return styles.qualifies
    return ''
  }

  return (
    <main className={styles.page}>
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>STANDINGS & LEADERBOARD</h1>
            <p className={styles.subtitle}>
              Best-16 Scoring System • Top 16 overall teams advance to the Grand Finals
            </p>
          </div>
          <div className={styles.headerRight}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="🔍 Search team name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Desktop Table */}
        <div className={`${styles.tableWrapper} hide-mobile`}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '64px' }}>RANK</th>
                  <th>TEAM NAME</th>
                  <th style={{ textAlign: 'center' }}>MATCHES PLAYED</th>
                  <th style={{ textAlign: 'center' }}>BEST-16 TOTAL</th>
                  <th style={{ textAlign: 'center' }}>TOTAL FINISHES</th>
                  <th style={{ width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <>
                    <tr
                      key={row.team_id}
                      className={`${styles.teamRow} ${getRowRankClass(row.rank)} ${expandedTeam === row.team_id ? styles.expanded : ''}`}
                      onClick={() => setExpandedTeam(expandedTeam === row.team_id ? null : row.team_id)}
                    >
                      <td>
                        <span className={`badge ${getRankBadgeClass(row.rank)}`}>
                          #{row.rank}
                        </span>
                      </td>
                      <td>
                        <div className={styles.teamNameCell}>
                          <span className={styles.teamNameText}>{row.team_name}</span>
                          {row.rank <= 16 && (
                            <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>FINALS QUALIFIED</span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', color: '#b8b8b8', fontWeight: '600' }}>
                        {row.matches_played}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <strong style={{ color: '#facc15', fontSize: '1.1rem', fontWeight: '800' }}>
                          {row.best_16_total}
                        </strong>
                      </td>
                      <td style={{ textAlign: 'center', color: '#b8b8b8', fontWeight: '600' }}>
                        {row.total_kills}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={styles.expandIcon}>
                          {expandedTeam === row.team_id ? '▲' : '▼'}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded match breakdown */}
                    {expandedTeam === row.team_id && (
                      <tr key={`${row.team_id}-expanded`}>
                        <td colSpan={6} className={styles.expandedCell}>
                          <MatchBreakdown matches={teamMatches[row.team_id] || []} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: '#888888', padding: '3rem 1.5rem', fontFamily: 'Inter, sans-serif' }}>
                      No registered teams found matching search query
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card List */}
        <div className={styles.mobileList}>
          {filtered.map(row => (
            <div key={row.team_id} className={`${styles.mobileCard} ${getRowRankClass(row.rank)}`}>
              <button
                className={styles.mobileCardHeader}
                onClick={() => setExpandedTeam(expandedTeam === row.team_id ? null : row.team_id)}
              >
                <div className={styles.mobileCardLeft}>
                  <span className={`badge ${getRankBadgeClass(row.rank)}`}>#{row.rank}</span>
                  <div>
                    <div className={styles.mobileTeamName}>{row.team_name}</div>
                    <div className={styles.mobileTeamMeta}>
                      {row.matches_played} MATCHES PLAYED
                    </div>
                  </div>
                </div>
                <div className={styles.mobileCardRight}>
                  <div>
                    <div className={styles.mobileStatVal}>{row.best_16_total}</div>
                    <div className={styles.mobileStatLabel}>BEST-16</div>
                  </div>
                  <span className={styles.expandIcon}>{expandedTeam === row.team_id ? '▲' : '▼'}</span>
                </div>
              </button>

              {expandedTeam === row.team_id && (
                <div className={styles.mobileExpanded}>
                  <div className={styles.mobileStats}>
                    <div>
                      <div className={styles.mobileStatVal}>{row.total_kills}</div>
                      <div className={styles.mobileStatLabel}>TOTAL FINISHES</div>
                    </div>
                    {row.rank <= 16 && (
                      <span className="badge badge-gold">✓ QUALIFIES FOR FINALS</span>
                    )}
                  </div>
                  <MatchBreakdown matches={teamMatches[row.team_id] || []} />
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', color: '#888888', padding: '3rem 1.5rem', fontFamily: 'Inter, sans-serif' }}>
              No registered teams found matching search query
            </p>
          )}
        </div>
      </div>
    </main>
  )
}

function MatchBreakdown({ matches }: { matches: MatchEntry[] }) {
  if (matches.length === 0) {
    return <p style={{ color: '#777777', fontSize: '0.8rem', padding: '0.75rem 1.25rem' }}>No match score history recorded yet</p>
  }

  // Sort by date then match number
  const sorted = [...matches].sort((a, b) => {
    const dateA = a.slots?.date || ''
    const dateB = b.slots?.date || ''
    if (dateA !== dateB) return dateA.localeCompare(dateB)
    return a.match_number - b.match_number
  })

  // Mark top 16 matches
  const scoresSorted = [...matches].sort((a, b) => b.total_points - a.total_points)
  const top16Set = new Set(scoresSorted.slice(0, 16).map(m => `${m.slot_id}-${m.match_number}`))

  return (
    <div style={{ padding: '1rem 1.25rem', overflowX: 'auto' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {sorted.map((m, i) => {
          const key = `${m.slot_id}-${m.match_number}`
          const isTop16 = top16Set.has(key)
          return (
            <div
              key={i}
              title={`Placement: #${m.placement} | Kills: ${m.kills} | Points: ${m.total_points}`}
              style={{
                background: isTop16 ? '#272727' : '#1d1d1d',
                border: `1px solid ${isTop16 ? '#fbbf24' : '#323232'}`,
                borderRadius: '6px',
                padding: '0.35rem 0.6rem',
                fontSize: '0.75rem',
                minWidth: '44px',
                textAlign: 'center',
                color: isTop16 ? '#fbbf24' : '#b8b8b8',
                fontWeight: isTop16 ? 800 : 500,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {m.total_points} Pts
            </div>
          )
        })}
      </div>
      <p style={{ fontSize: '0.72rem', color: '#777777', marginTop: '0.6rem', fontFamily: 'Inter, sans-serif' }}>
        ⚡ Gold outline indicates scores included in Best-16 total calculation.
      </p>
    </div>
  )
}
