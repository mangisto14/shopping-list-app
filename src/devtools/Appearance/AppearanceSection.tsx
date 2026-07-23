// src/devtools/Appearance/AppearanceSection.tsx
import { Section, SelectRow } from '../shared/controls';
import { appearanceStore, DEFAULT_APPEARANCE_SETTINGS } from './store';
import { useLanguage } from '../../LanguageContext';

export default function AppearanceSection({
  expanded, onToggle, visible, matches,
}: {
  expanded: boolean; onToggle: () => void; visible: boolean; matches: (label: string, id?: string) => boolean;
}) {
  const appearance = appearanceStore.useValue();
  const { language, setLanguage } = useLanguage();

  return (
    <Section title="Appearance" expanded={expanded} onToggle={onToggle} visible={visible}>
      {matches('Language', 'appearance.language') && (
        <SelectRow
          id="appearance.language"
          label="Language"
          hint="The app's real language setting - not a devtools-only override."
          value={language}
          options={[
            { value: 'he', label: 'Hebrew' },
            { value: 'en', label: 'English' },
          ]}
          onChange={(v) => setLanguage(v as 'he' | 'en')}
        />
      )}
      {matches('Direction', 'appearance.direction') && (
        <SelectRow
          id="appearance.direction"
          label="Direction"
          hint="Force a layout direction regardless of language, for testing RTL/LTR independently. Auto follows Language, exactly as the app already does."
          value={appearance.direction}
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'rtl', label: 'RTL' },
            { value: 'ltr', label: 'LTR' },
          ]}
          onChange={(v) => appearanceStore.set({ direction: v })}
          onReset={() => appearanceStore.resetField('direction')}
        />
      )}
      {matches('Theme', 'appearance.theme') && (
        <SelectRow
          id="appearance.theme"
          label="Theme"
          hint="Applies color-scheme and a dark/light class on <html> (affects native form controls now; the app's own UI has no dark: styling yet)."
          value={appearance.theme}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ]}
          onChange={(v) => appearanceStore.set({ theme: v })}
          onReset={() => appearanceStore.resetField('theme')}
        />
      )}
      <div className="px-4 py-3">
        <button
          onClick={() => appearanceStore.reset()}
          className="w-full text-sm font-semibold py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Restore Defaults
        </button>
      </div>
      <p className="px-4 pb-3 text-[11px] text-gray-400">
        Defaults: direction {DEFAULT_APPEARANCE_SETTINGS.direction}, theme {DEFAULT_APPEARANCE_SETTINGS.theme}.
      </p>
    </Section>
  );
}
