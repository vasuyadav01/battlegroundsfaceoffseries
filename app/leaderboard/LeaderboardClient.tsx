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
  const [isMobileExpanded, setIsMobileExpanded] = useState(false)

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

  function getRankClass(rank: number) {
    if (rank === 1) return 'rank-1'
    if (rank === 2) return 'rank-2'
    if (rank === 3) return 'rank-3'
    return ''
  }

  function getRankBadgeClass(rank: number) {
    if (rank === 1) return 'badge-gold'
    if (rank === 2) return 'badge-silver'
    if (rank === 3) return 'badge-bronze'
    return 'badge-neutral'
  }

  return (
    <main className={styles.page}>
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className="text-heading" style={{ fontSize: '2rem' }}>Leaderboard</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
              Best-16 system — only your top 16 match scores count. Updated after every slot.
            </p>
          </div>
          <div className={styles.headerRight}>
            <input
              type="text"
              className={`form-input ${styles.searchInput}`}
              placeholder="🔍 Search team..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button
              className={`btn btn-secondary btn-sm hide-mobile`}
              onClick={() => setIsMobileExpanded(!isMobileExpanded)}
            >
              {isMobileExpanded ? 'Collapse' : 'Full Table'}
            </button>
          </div>
        </div>

        <div className={styles.tableInfo}>
          <span className="badge badge-success">
            🟢 Live — {rows.length} teams
          </span>
          {rows.length >= 16 && (
            <span className="badge badge-gold">
              Top 16 qualify for Grand Finals
            </span>
          )}
        </div>

        {/* Desktop Table */}
        <div className={`${styles.tableWrapper} hide-mobile`}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '56px' }}>Rank</th>
                  <th>Team</th>
                  <th style={{ textAlign: 'center' }}>Matches</th>
                  <th style={{ textAlign: 'center' }}>Best-16 Total</th>
                  <th style={{ textAlign: 'center' }}>Total Kills</th>
                  <th style={{ width: '80px' }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <>
                    <tr
                      key={row.team_id}
                      className={`${styles.teamRow} ${row.rank <= 16 ? styles.qualifies : ''} ${expandedTeam === row.team_id ? styles.expanded : ''}`}
                      onClick={() => setExpandedTeam(expandedTeam === row.team_id ? null : row.team_id)}
                    >
                      <td>
                        <span className={`badge ${getRankBadgeClass(row.rank)} ${getRankClass(row.rank)}`}>
                          #{row.rank}
                        </span>
                      </td>
                      <td>
                        <div className={styles.teamNameCell}>
                          <span className={styles.teamNameText}>{row.team_name}</span>
                          {row.rank <= 16 && (
                            <span className="badge badge-gold" style={{ fontSize: '0.6rem' }}>Finals</span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        {row.matches_played}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <strong style={{ color: 'var(--brand-primary)', fontSize: '1.05rem' }}>
                          {row.best_16_total}
                        </strong>
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
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
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      No teams found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card List */}
        <div className={`${styles.mobileList}`}>
          {filtered.map(row => (
            <div key={row.team_id} className={styles.mobileCard}>
              <button
                className={styles.mobileCardHeader}
                onClick={() => setExpandedTeam(expandedTeam === row.team_id ? null : row.team_id)}
              >
                <div className={styles.mobileCardLeft}>
                  <span className={`badge ${getRankBadgeClass(row.rank)}`}>#{row.rank}</span>
                  <div>
                    <div className={styles.mobileTeamName}>{row.team_name}</div>
                    <div className={styles.mobileTeamMeta}>
                      {row.matches_played} matches played
                    </div>
                  </div>
                </div>
                <div className={styles.mobileCardRight}>
                  <div>
                    <div className={styles.mobileStatVal}>{row.best_16_total}</div>
                    <div className={styles.mobileStatLabel}>Best-16</div>
                  </div>
                  <span className={styles.expandIcon}>{expandedTeam === row.team_id ? '▲' : '▼'}</span>
                </div>
              </button>

              {expandedTeam === row.team_id && (
                <div className={styles.mobileExpanded}>
                  <div className={styles.mobileStats}>
                    <div>
                      <div className={styles.mobileStatVal}>{row.total_kills}</div>
                      <div className={styles.mobileStatLabel}>Total Kills</div>
                    </div>
                    {row.rank <= 16 && (
                      <span className="badge badge-gold">✓ Qualifies for Finals</span>
                    )}
                  </div>
                  <MatchBreakdown matches={teamMatches[row.team_id] || []} compact />
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              No teams found
            </p>
          )}
        </div>
      </div>
    </main>
  )
}

function MatchBreakdown({ matches, compact = false }: { matches: MatchEntry[]; compact?: boolean }) {
  if (matches.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.5rem' }}>No match data yet</p>
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
  const top16Ids = new Set(scoresSorted.slice(0, 16).map((_, i) => i))
  const top16Set = new Set(scoresSorted.slice(0, 16).map(m => `${m.slot_id}-${m.match_number}`))

  return (
    <div style={{ padding: '0.75rem', overflowX: 'auto' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
        {sorted.map((m, i) => {
          const key = `${m.slot_id}-${m.match_number}`
          const isTop16 = top16Set.has(key)
          return (
            <div
              key={i}
              title={`#${m.placement} placement, ${m.kills} kills = ${m.total_points} pts`}
              style={{
                background: isTop16 ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-elevated)',
                border: `1px solid ${isTop16 ? 'rgba(245, 158, 11, 0.35)' : 'var(--border-subtle)'}`,
                borderRadius: '6px',
                padding: '0.3rem 0.5rem',
                fontSize: '0.75rem',
                minWidth: '40px',
                textAlign: 'center',
                color: isTop16 ? 'var(--brand-primary)' : 'var(--text-secondary)',
                fontWeight: isTop16 ? 700 : 400,
              }}
            >
              {m.total_points}
            </div>
          )
        })}
      </div>
      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
        🟡 Highlighted = counted in best-16. Hover for match details.
      </p>
    </div>
  )
}
