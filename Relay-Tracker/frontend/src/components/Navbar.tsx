import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Radio, Bot, LogOut, User, ChevronDown, Users, Home, ListTodo, Wifi, WifiOff, Mail, Keyboard } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { useWorkspace } from '../hooks/useWorkspace';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import { ShortcutsHelpModal, ShortcutsHint } from './ShortcutsHelp';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

// Network status hook
function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

function NetworkStatusIndicator() {
  const isOnline = useNetworkStatus();

  return (
    <div
      className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
        isOnline
          ? 'bg-green-100 dark:bg-green-900/30'
          : 'bg-red-100 dark:bg-red-900/30'
      }`}
      title={isOnline ? 'Online' : 'Offline'}
    >
      {isOnline ? (
        <Wifi className="w-4 h-4 text-green-600 dark:text-green-400" />
      ) : (
        <WifiOff className="w-4 h-4 text-red-600 dark:text-red-400" />
      )}
    </div>
  );
}

function NavLink({ href, children, isActive }: { href: string; children: React.ReactNode; isActive?: boolean }) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        isActive
          ? 'bg-relay-orange/10 text-relay-orange'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
      }`}
    >
      {children}
    </a>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors = {
    admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    sqa: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    user: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors[role as keyof typeof colors] || colors.user}`}>
      {role}
    </span>
  );
}

export function Navbar() {
  const { toggleTheme, isDark } = useTheme();
  const { user, isAuthenticated, signOut, hasRole } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [showShortcutsHint, setShowShortcutsHint] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut to open help modal (?)
  useKeyboardShortcut('?', () => setIsShortcutsOpen(true), { shift: true });

  // Global navigation shortcuts
  useKeyboardShortcut(['g', 'h'], () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  useKeyboardShortcut(['g', 'i'], () => {
    window.history.pushState({}, '', '/issues');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  useKeyboardShortcut(['g', 'a'], () => {
    if (hasRole('admin')) {
      window.history.pushState({}, '', '/admin');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setIsDropdownOpen(false);
    await signOut();
  };

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and Nav Links */}
            <div className="flex items-center gap-4">
              {/* Logo - responds to workspace */}
              <NavLink href="/" isActive={window.location.pathname === '/'}>
                <div className="flex items-center gap-2">
                  <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${
                    activeWorkspace === 'jira' ? 'bg-relay-gradient' : 'bg-botter-gradient'
                  }`}>
                    {activeWorkspace === 'jira' ? (
                      <Radio className="w-5 h-5 text-white" />
                    ) : (
                      <Bot className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <span className={`text-xl font-bold ${
                    activeWorkspace === 'jira' ? 'text-relay-gradient' : 'text-botter-gradient'
                  }`}>
                    Relay
                  </span>
                </div>
              </NavLink>

              {/* Workspace Switcher */}
              {isAuthenticated && <WorkspaceSwitcher />}

              {/* Nav Links - only show for Jira workspace */}
              {isAuthenticated && activeWorkspace === 'jira' && (
                <div className="hidden sm:flex items-center gap-1">
                  <NavLink href="/" isActive={window.location.pathname === '/'}>
                    <Home className="w-4 h-4" />
                    Home
                  </NavLink>
                  <NavLink href="/issues" isActive={window.location.pathname.startsWith('/issues')}>
                    <ListTodo className="w-4 h-4" />
                    Issues
                  </NavLink>
                </div>
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Network status indicator */}
              <NetworkStatusIndicator />

              {/* Keyboard shortcuts button */}
              {isAuthenticated && (
                <button
                  onClick={() => setIsShortcutsOpen(true)}
                  className="hidden sm:flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Keyboard shortcuts"
                  title="Keyboard shortcuts (?)"
                >
                  <Keyboard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              )}

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {/* User menu */}
              {isAuthenticated && user && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    {/* Avatar */}
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-relay-gradient flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] py-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                      {/* User info */}
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.name}
                              className="w-10 h-10 rounded-full flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-relay-gradient flex items-center justify-center flex-shrink-0">
                              <span className="text-lg font-medium text-white">
                                {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {user.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <RoleBadge role={user.role} />
                        </div>
                      </div>

                      {/* Mobile navigation - only shown on small screens and for Jira workspace */}
                      {activeWorkspace === 'jira' && (
                        <div className="sm:hidden py-1 border-b border-gray-200 dark:border-gray-700">
                          <button
                            onClick={() => {
                              setIsDropdownOpen(false);
                              window.history.pushState({}, '', '/');
                              window.dispatchEvent(new PopStateEvent('popstate'));
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm ${
                              window.location.pathname === '/'
                                ? 'text-relay-orange bg-relay-orange/10'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <Home className="w-4 h-4" />
                            Home
                          </button>
                          <button
                            onClick={() => {
                              setIsDropdownOpen(false);
                              window.history.pushState({}, '', '/issues');
                              window.dispatchEvent(new PopStateEvent('popstate'));
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm ${
                              window.location.pathname.startsWith('/issues')
                                ? 'text-relay-orange bg-relay-orange/10'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <ListTodo className="w-4 h-4" />
                            Issues
                          </button>
                        </div>
                      )}

                      {/* Menu items */}
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            window.history.pushState({}, '', '/profile');
                            window.dispatchEvent(new PopStateEvent('popstate'));
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <User className="w-4 h-4" />
                          Profile
                        </button>

                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            setIsShortcutsOpen(true);
                          }}
                          className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <div className="flex items-center gap-3">
                            <Keyboard className="w-4 h-4" />
                            Keyboard Shortcuts
                          </div>
                          <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">?</kbd>
                        </button>

                        {hasRole('admin') && (
                          <>
                            <button
                              onClick={() => {
                                setIsDropdownOpen(false);
                                window.history.pushState({}, '', '/admin');
                                window.dispatchEvent(new PopStateEvent('popstate'));
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Users className="w-4 h-4" />
                              Manage Users
                            </button>
                            <button
                              onClick={() => {
                                setIsDropdownOpen(false);
                                window.history.pushState({}, '', '/admin/whitelist');
                                window.dispatchEvent(new PopStateEvent('popstate'));
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Mail className="w-4 h-4" />
                              Email Whitelist
                            </button>
                          </>
                        )}
                      </div>

                      {/* Sign out */}
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-1">
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Keyboard shortcuts modal */}
      <ShortcutsHelpModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* First-time hint for keyboard shortcuts */}
      {isAuthenticated && showShortcutsHint && (
        <ShortcutsHint onDismiss={() => setShowShortcutsHint(false)} />
      )}
    </>
  );
}
