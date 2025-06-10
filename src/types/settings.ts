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