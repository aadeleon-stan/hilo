import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Playtest settings are only available under `npm run dev`.
export const SETTINGS_ENABLED = import.meta.env.DEV;

const useSettingsStore = create(
  persist(
    (set) => ({
      easyMode: false,
      showOptimal: false,
      toggleEasyMode: () => set((s) => ({ easyMode: !s.easyMode })),
      toggleShowOptimal: () => set((s) => ({ showOptimal: !s.showOptimal })),
    }),
    { name: 'hilo-settings' }
  )
);

// Effective value of a setting: always false in production builds, even if
// localStorage still holds a value saved during development.
export function useSetting(key) {
  const value = useSettingsStore((s) => s[key]);
  return SETTINGS_ENABLED && value;
}

export default useSettingsStore;
