import { BodyIcon, CalcIcon, HomeIcon, SyringeIcon } from './Icons';

export const TABS = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'calc', label: 'Calculator', Icon: CalcIcon },
  { id: 'jabs', label: 'Jabs', Icon: SyringeIcon },
  { id: 'body', label: 'Body', Icon: BodyIcon },
] as const;

export type Tab = (typeof TABS)[number]['id'];

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="glass tabbar" aria-label="Tabs">
      {TABS.map(({ id, label, Icon }) => (
        <button key={id} type="button" data-sound="tab" aria-current={tab === id ? 'page' : undefined} onClick={() => onChange(id)}>
          <Icon />
          {label}
        </button>
      ))}
    </nav>
  );
}
