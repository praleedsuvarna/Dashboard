// Define the API interface
interface ApiClient {
  get: (url: string) => Promise<{ data: UserSettings }>;
  put: (url: string, data: Partial<UserSettings>) => Promise<{ data: UserSettings }>;
  post: (url: string) => Promise<{ data: UserSettings }>;
}

// Extend Window interface to include api
declare global {
  interface Window {
    api?: ApiClient;
  }
}

export interface UserSettings {
  // Theme Settings
  darkMode: boolean;
  primaryColor: string;
  
  // Display Settings
  itemsPerPage: number;
  defaultViewMode: 'grid' | 'list';
  
  // Notification Settings
  emailNotifications: boolean;
  inAppNotifications: boolean;
}

const STORAGE_KEY = 'user_settings';

const defaultSettings: UserSettings = {
  darkMode: false,
  primaryColor: '#1976d2',
  itemsPerPage: 10,
  defaultViewMode: 'grid',
  emailNotifications: true,
  inAppNotifications: true
};

class SettingsService {
  private settings: UserSettings;

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): UserSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
    }
    return defaultSettings;
  }

  private saveSettings(settings: UserSettings): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
    }
  }

  async getSettings(): Promise<UserSettings> {
    try {
      // Try to fetch from API if available
      if (typeof window !== 'undefined' && window.api) {
        const response = await window.api.get('/users/settings');
        if (response.data) {
          this.settings = response.data;
          this.saveSettings(this.settings);
          return this.settings;
        }
      }
    } catch (error) {
      console.error('Error fetching settings from API:', error);
    }
    return this.settings;
  }

  async updateSettings(newSettings: Partial<UserSettings>): Promise<UserSettings> {
    try {
      // Try to update via API if available
      if (typeof window !== 'undefined' && window.api) {
        const response = await window.api.put('/users/settings', newSettings);
        if (response.data) {
          this.settings = { ...this.settings, ...response.data };
          this.saveSettings(this.settings);
          return this.settings;
        }
      }
    } catch (error) {
      console.error('Error updating settings via API:', error);
    }

    // Fallback to localStorage
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings(this.settings);
    return this.settings;
  }

  async resetSettings(): Promise<UserSettings> {
    try {
      // Try to reset via API if available
      if (typeof window !== 'undefined' && window.api) {
        const response = await window.api.post('/users/settings/reset');
        if (response.data) {
          this.settings = response.data;
          this.saveSettings(this.settings);
          return this.settings;
        }
      }
    } catch (error) {
      console.error('Error resetting settings via API:', error);
    }

    // Fallback to default settings
    this.settings = defaultSettings;
    this.saveSettings(this.settings);
    return this.settings;
  }
}

export const settingsService = new SettingsService(); 