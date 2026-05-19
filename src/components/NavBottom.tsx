import type { Tab } from '../types'

interface NavBottomProps {
  active: Tab
  onChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'library', label: 'Library' },
  { id: 'streak', label: 'Streak' },
  { id: 'settings', label: 'Settings' },
]

export function NavBottom({ active, onChange }: NavBottomProps) {
  return (
    <nav className="safe-bottom shrink-0 border-t border-surface-overlay/40 bg-surface-raised/70 backdrop-blur-lg">
      <div className="flex justify-around px-3 py-3 gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all font-serif ${
              active === tab.id 
                ? 'bg-accent/20 text-accent scale-105' 
                : 'text-muted hover:text-text'
            }`}
          >
            <span className="text-xs font-semibold">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
