import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface AppSettings {
  darkTheme: boolean;
  autoSave: boolean;
  masterVolume: number;
  bufferSize: string;
  defaultFormat: 'wav' | 'mp3';
}

const DEFAULT_SETTINGS: AppSettings = {
  darkTheme: true,
  autoSave: false,
  masterVolume: 80,
  bufferSize: '2048',
  defaultFormat: 'wav',
};

interface SettingsContextValue {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem('soundstorm-settings');
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  // Persist on change
  useEffect(() => {
    localStorage.setItem('soundstorm-settings', JSON.stringify(settings));
  }, [settings]);

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', !settings.darkTheme);
  }, [settings.darkTheme]);

  const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
