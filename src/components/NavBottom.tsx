import type { Tab } from '../types'

interface NavBottomProps {
  active: Tab
  onChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'library', label: 'Library', icon: '📚' },
  { id: 'streak', label: 'Streak', icon: '🔥' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

export function NavBottom({ active, onChange }: NavBottomProps) {
  return (
    <nav className="safe-bottom shrink-0 border-t border-surface-overlay bg-surface-raised/80 backdrop-blur-lg">
      <div className="flex justify-around px-2 py-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-xs transition-colors ${
              active === tab.id ? 'text-accent' : 'text-muted'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
