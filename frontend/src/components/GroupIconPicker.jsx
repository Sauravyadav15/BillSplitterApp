// frontend/src/components/GroupIconPicker.jsx

import { GROUP_ICONS, GROUP_THEMES } from '../utils/groupThemes';

export default function GroupIconPicker({ icon, onIconChange, theme, onThemeChange }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <span className="field-label">Group color</span>
        <div className="flex flex-wrap gap-2">
          {GROUP_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-label={t.label}
              aria-pressed={theme === t.id}
              onClick={() => onThemeChange(t.id)}
              className="h-7 w-7 shrink-0 rounded-full transition-transform hover:scale-110"
              style={{
                backgroundImage: t.gradient,
                outline: theme === t.id ? '2px solid var(--text-h)' : 'none',
                outlineOffset: '2px',
              }}
            />
          ))}
        </div>
      </div>

      <div>
        <span className="field-label">Group icon</span>
        <div className="grid max-h-32 grid-cols-8 gap-1.5 overflow-y-auto rounded-xl border border-border bg-surface-2 p-2.5">
          {GROUP_ICONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={`Icon ${emoji}`}
              aria-pressed={icon === emoji}
              onClick={() => onIconChange(emoji)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-transform hover:scale-110"
              style={{ outline: icon === emoji ? '2px solid var(--text-h)' : 'none', outlineOffset: '1px' }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
