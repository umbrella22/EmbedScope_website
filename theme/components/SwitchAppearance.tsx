import { useContext } from 'react';
import { ThemeContext, useLang } from '@rspress/core/runtime';
import { IconMoon, IconSun, SvgWrapper } from '@rspress/core/theme-original';

// Replace the default click-only control with a native keyboard-accessible
// button. ThemeContext retains Rspress persistence and document theme state.
export function SwitchAppearance({ onClick }: { onClick?: () => void }) {
  const { theme, setTheme } = useContext(ThemeContext);
  const en = useLang() === 'en';
  const dark = theme === 'dark';
  return <button
    type="button"
    className="rp-switch-appearance"
    aria-label={en ? 'Toggle dark theme' : '切换深色主题'}
    aria-pressed={dark}
    onClick={() => {
      setTheme?.(dark ? 'light' : 'dark');
      onClick?.();
    }}
  >
    <span aria-hidden="true">
      <SvgWrapper className="rp-switch-appearance__icon rp-switch-appearance__icon--sun" icon={IconSun} fill="currentColor" />
      <SvgWrapper className="rp-switch-appearance__icon rp-switch-appearance__icon--moon" icon={IconMoon} fill="currentColor" />
    </span>
  </button>;
}
