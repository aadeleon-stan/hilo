import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import useGameStore from './useGameStore';

// Playtest settings are always available under `npm run dev`, and in any build
// during a roguelike run, where they're offered to playtesters.
export const SETTINGS_ENABLED = import.meta.env.DEV;

export function settingsAvailable(mode) {
  return SETTINGS_ENABLED || mode === 'roguelike';
}

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

// Effective value of a setting: false where settings aren't available, even if
// localStorage still holds a value saved elsewhere.
export function useSetting(key) {
  const value = useSettingsStore((s) => s[key]);
  const mode = useGameStore((s) => s.mode);
  return settingsAvailable(mode) && value;
}

export default useSettingsStore;
