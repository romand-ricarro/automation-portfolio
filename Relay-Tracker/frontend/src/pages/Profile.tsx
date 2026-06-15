import { useState } from 'react';
import { User, Mail, Shield, Bell, Moon, Sun, Monitor, Loader2, Check } from 'lucide-react';
import { MainLayout, showToast } from '../components';
import { useAuth } from '../hooks/useAuth';
import type { UserPreferences } from '../context/AuthContext';

function RoleBadge({ role }: { role: string }) {
  const colors = {
    admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    sqa: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    user: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  };

  const icons = {
    admin: Shield,
    sqa: Shield,
    user: User,
  };

  const Icon = icons[role as keyof typeof icons] || User;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${colors[role as keyof typeof colors] || colors.user}`}>
      <Icon className="w-4 h-4" />
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

function ToggleSwitch({ enabled, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-relay-orange' : 'bg-gray-200 dark:bg-gray-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

interface ThemeSelectorProps {
  value: string;
  onChange: (theme: 'light' | 'dark' | 'system') => void;
  disabled?: boolean;
}

function ThemeSelector({ value, onChange, disabled }: ThemeSelectorProps) {
  const options = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ] as const;

  return (
    <div className="flex gap-2">
      {options.map((option) => {
        const Icon = option.icon;
        const isSelected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            disabled={disabled}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
              isSelected
                ? 'border-relay-orange bg-relay-orange/10 text-relay-orange'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Icon className="w-4 h-4" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function ProfilePage() {
  const { user, updatePreferences } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [savedField, setSavedField] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  const handlePreferenceChange = async (
    key: keyof UserPreferences,
    value: boolean | string
  ) => {
    setIsSaving(true);
    setSavedField(null);

    try {
      await updatePreferences({ [key]: value });
      setSavedField(key);
      setTimeout(() => setSavedField(null), 2000);
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Failed to save',
        message: error instanceof Error ? error.message : 'Could not update preferences',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        {/* Profile Header */}
        <div className="glassmorphism dark:glassmorphism-dark rounded-2xl p-8 mb-6">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-20 h-20 rounded-full ring-4 ring-white dark:ring-gray-800 shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-relay-gradient flex items-center justify-center ring-4 ring-white dark:ring-gray-800 shadow-lg">
                  <span className="text-2xl font-bold text-white">
                    {user.name?.charAt(0) || user.email.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {user.name || 'User'}
              </h1>
              <div className="flex items-center gap-2 mt-1 text-gray-600 dark:text-gray-400">
                <Mail className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
              <div className="mt-3">
                <RoleBadge role={user.role} />
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="glassmorphism dark:glassmorphism-dark rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5 text-relay-orange" />
            Notification Settings
          </h2>

          <div className="space-y-6">
            {/* Email Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  Email Notifications
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Receive updates about your issues via email
                </p>
              </div>
              <div className="flex items-center gap-2">
                {savedField === 'email_notifications' && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
                {isSaving && savedField !== 'email_notifications' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                ) : (
                  <ToggleSwitch
                    enabled={user.preferences?.email_notifications ?? true}
                    onChange={(enabled) => handlePreferenceChange('email_notifications', enabled)}
                    disabled={isSaving}
                  />
                )}
              </div>
            </div>

            {/* Discord Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  Discord Notifications
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Get notified in your Discord channel
                </p>
              </div>
              <div className="flex items-center gap-2">
                {savedField === 'discord_notifications' && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
                {isSaving && savedField !== 'discord_notifications' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                ) : (
                  <ToggleSwitch
                    enabled={user.preferences?.discord_notifications ?? true}
                    onChange={(enabled) => handlePreferenceChange('discord_notifications', enabled)}
                    disabled={isSaving}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="glassmorphism dark:glassmorphism-dark rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
            <Sun className="w-5 h-5 text-relay-orange" />
            Appearance
          </h2>

          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Theme
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Choose how Relay looks for you
            </p>
            <div className="flex items-center gap-2">
              <ThemeSelector
                value={user.preferences?.theme ?? 'system'}
                onChange={(theme) => handlePreferenceChange('theme', theme)}
                disabled={isSaving}
              />
              {savedField === 'theme' && (
                <Check className="w-4 h-4 text-green-500" />
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
