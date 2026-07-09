'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useProfile } from '@/lib/profile-context'

const DIRECTOR_TABS = [
  { href: '/teams',     label: 'Teams',     icon: TabTeams },
  { href: '/players',   label: 'Players',   icon: TabPlayers },
  { href: '/coaches',   label: 'Staff',     icon: TabCoaches },
  { href: '/game-card', label: 'Game Card', icon: TabGameCard },
  { href: '/drills',    label: 'Drills',    icon: TabDrills },
]

const COACH_TABS = [
  { href: '/teams',     label: 'Teams',     icon: TabTeams },
  { href: '/game-card', label: 'Game Card', icon: TabGameCard },
  { href: '/drills',    label: 'Drills',    icon: TabDrills },
]

const ORANGE = '#FE5A01'
const DIM    = 'rgba(255,255,255,0.4)'

export default function BottomNav() {
  const pathname = usePathname()
  const { isCoach } = useProfile()
  const tabs = isCoach ? COACH_TABS : DIRECTOR_TABS

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30"
      style={{ background: '#0A0A0A', borderTop: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="max-w-2xl mx-auto flex">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors"
              style={{ color: active ? ORANGE : DIM }}
            >
              <Icon active={active} />
              <span
                className="text-[10px] font-semibold uppercase tracking-wider leading-none"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
      <div style={{ height: 'env(safe-area-inset-bottom)' }} />
    </nav>
  )
}

function TabTeams({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}

function TabPlayers({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  )
}

function TabCoaches({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
    </svg>
  )
}

function TabGameCard({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="12" cy="12" r="3"/>
      <line x1="12" y1="3" x2="12" y2="9"/>
      <line x1="12" y1="15" x2="12" y2="21"/>
    </svg>
  )
}

function TabDrills({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  )
}
