import { BodyIcon, CalcIcon, SyringeIcon } from './Icons';

export type Tab = 'calc' | 'jabs' | 'body';

const tabs = [
  { id: 'calc', label: 'Calculator', Icon: CalcIcon },
  { id: 'jabs', label: 'Jabs', Icon: SyringeIcon },
  { id: 'body', label: 'Body', Icon: BodyIcon },
] as const;

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="glass tabbar" aria-label="Tabs">
      {tabs.map(({ id, label, Icon }) => (
        <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => onChange(id)}>
          <Icon />
          {label}
        </button>
      ))}
    </nav>
  );
}
