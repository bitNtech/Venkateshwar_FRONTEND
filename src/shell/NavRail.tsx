import { useState } from 'react'
import type { ReactElement } from 'react'
import { footerNav, primaryNav, supportNav } from '../data/mock'
import aicaMark from '../assets/aica-mark-light.png'
import type { NavItem } from '../types'
import {
  AgentBuilderIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  BudgetIcon,
  DashboardIcon,
  HelpIcon,
  ImprovementFeedIcon,
  IntegrationsIcon,
  KnowledgeBaseIcon,
  SettingsIcon,
  SimulationIcon,
  VoiceRecordingIcon,
} from '../components/icons'

const ICONS: Record<string, (props: { className?: string }) => ReactElement> = {
  dashboard: DashboardIcon,
  'handled-calls': VoiceRecordingIcon,
  'knowledge-base': KnowledgeBaseIcon,
  'agent-builder': AgentBuilderIcon,
  simulation: SimulationIcon,
  'improvement-feed': ImprovementFeedIcon,
  budget: BudgetIcon,
  integrations: IntegrationsIcon,
  settings: SettingsIcon,
  help: HelpIcon,
}

/** Conceptual grouping of the primary nav — same items, just structured so
 * the rail reads as a system rather than a flat list. */
const GROUPS: { label: string; ids: string[] }[] = [
  { label: 'Operations', ids: ['dashboard', 'handled-calls'] },
  {
    label: 'Intelligence',
    ids: ['knowledge-base', 'agent-builder', 'simulation', 'improvement-feed'],
  },
]

interface NavRailProps {
  activeId: string
  onSelect: (id: string) => void
}

export function NavRail({ activeId, onSelect }: NavRailProps) {
  const [collapsed, setCollapsed] = useState(false)
  const expanded = !collapsed
  const byId = Object.fromEntries(primaryNav.map((item) => [item.id, item]))

  return (
    <nav
      aria-label="Primary"
      className={`aica-nav-rail flex h-screen w-[72px] shrink-0 flex-col bg-nav/95 backdrop-blur-xl transition-[width] duration-150 ease-out ${
        expanded ? 'lg:w-64' : 'lg:w-[72px]'
      }`}
    >
      <div
        className={`flex h-16 shrink-0 items-center px-4 lg:px-5 ${
          expanded ? 'gap-2.5' : 'lg:flex-col lg:justify-center lg:gap-1.5'
        }`}
      >
        <button
          type="button"
          onClick={() => onSelect('dashboard')}
          aria-label="Go to dashboard"
          className={`flex shrink-0 items-center rounded-md transition-opacity hover:opacity-80 ${
            expanded ? 'gap-2.5' : 'lg:flex-col lg:gap-1.5'
          }`}
        >
          <img src={aicaMark} alt="" className="h-7 w-7 shrink-0" aria-hidden="true" />
          {expanded && (
            <div className="hidden flex-col truncate lg:flex text-left">
              <span className="truncate font-display text-base font-bold tracking-tight text-white leading-tight">
                AICA
              </span>
              <span className="truncate text-[10px] font-semibold text-[#DDF2FB]/90 leading-tight">
                Venkateshwar Hospital
              </span>
            </div>
          )}
        </button>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          className={`hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-mist/45 transition-colors hover:bg-white/10 hover:text-mist lg:flex ${
            expanded ? 'ml-auto' : ''
          }`}
        >
          {collapsed ? (
            <ChevronsRightIcon className="h-4 w-4" />
          ) : (
            <ChevronsLeftIcon className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 py-3 lg:px-3">
        {GROUPS.map((group) => (
          <div key={group.label}>
            {expanded && (
              <p className="aica-nav-section-label hidden px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-mist/55 lg:block">
                {group.label}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {group.ids.map((id) => {
                const item = byId[id]
                if (!item) return null
                return (
                  <NavRow
                    key={item.id}
                    item={item}
                    active={item.id === activeId}
                    onSelect={onSelect}
                    expanded={expanded}
                  />
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 px-2 py-3 lg:px-3">
        {expanded && (
          <p className="aica-nav-section-label hidden px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-mist/55 lg:block">
            Governance
          </p>
        )}
        <ul className="flex flex-col gap-0.5">
          {footerNav.map((item) => (
            <NavRow
              key={item.id}
              item={item}
              active={item.id === activeId}
              onSelect={onSelect}
              expanded={expanded}
              muted
            />
          ))}
        </ul>
      </div>

      <div className="border-t border-white/10 px-2 py-3 lg:px-3">
        <ul className="flex flex-col gap-0.5">
          {supportNav.map((item) => (
            <NavRow
              key={item.id}
              item={item}
              active={item.id === activeId}
              onSelect={onSelect}
              expanded={expanded}
              muted
            />
          ))}
        </ul>
        <div className="mt-2 pt-2 border-t border-white/10">
          <a
            href="https://www.venkateshwarhospitals.com/"
            target="_blank"
            rel="noopener noreferrer"
            title="Redirect to official Venkateshwar Hospital Website"
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-[#DDF2FB] hover:bg-white/10 transition-colors cursor-pointer"
          >
            <span className="text-sm">↗</span>
            {expanded && <span className="truncate font-medium">Hospital Website</span>}
          </a>
        </div>
      </div>
    </nav>
  )
}

function NavRow({
  item,
  active,
  onSelect,
  expanded,
  muted,
}: {
  item: NavItem
  active: boolean
  onSelect: (id: string) => void
  expanded: boolean
  muted?: boolean
}) {
  const Icon = ICONS[item.id] ?? DashboardIcon
  return (
    <li>
      <button
        type="button"
        title={item.label}
        onClick={() => onSelect(item.id)}
        aria-current={active ? 'page' : undefined}
        className={`aica-nav-item group relative flex w-full items-center gap-3 rounded-lg border border-transparent px-2.5 py-2 text-left text-sm transition-all duration-200 lg:px-3 ${
          active
            ? 'aica-nav-bubble border-white/35 bg-white/[0.18] text-mist shadow-sm'
            : muted
              ? 'text-mist/45 hover:bg-white/10 hover:text-mist/80'
              : 'text-mist/70 hover:bg-white/10 hover:text-mist'
        }`}
      >
        {active && (
          <span
            className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-mist"
            aria-hidden="true"
          />
        )}
        <Icon
          className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-mist' : 'opacity-80'}`}
        />
        {expanded && (
          <span className={`aica-nav-label hidden truncate text-[13.5px] tracking-[0.01em] lg:inline ${active ? 'font-semibold' : 'font-medium'}`}>
            {item.label}
          </span>
        )}
        {expanded && item.badge ? (
          <span className="ml-auto hidden rounded-full bg-mist px-1.5 py-0.5 text-[11px] font-semibold leading-none text-nav lg:inline">
            {item.badge}
          </span>
        ) : null}
      </button>
    </li>
  )
}
