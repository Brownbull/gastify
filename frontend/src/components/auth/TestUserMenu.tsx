/**
 * Test User Selection Menu
 *
 * Provides a dropdown menu for selecting which test user to log in as.
 * Only visible in development/local environments.
 *
 * Test Users:
 * - Default: From .env (VITE_TEST_USER_EMAIL/PASSWORD)
 * - Alice, Bob, Charlie, Diana: Multi-user test accounts
 *
 * @example
 * ```tsx
 * <TestUserMenu onSelectUser={(email, password) => signIn(email, password)} />
 * ```
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Users } from 'lucide-react';
interface TestUser {
  id: string;
  email: string;
  password: string;
  displayName: string;
  description: string;
  color: string;
}

interface TestUserMenuProps {
  onSelectUser: (email: string, password: string) => Promise<void>;
}

// Multi-user password — env var with fallback (matches staging-test-users.json)
const MULTI_USER_PASSWORD = import.meta.env.VITE_STAGING_TEST_PASSWORD || 'test-password-123!';

// Check if staging mode (boletapp-staging project)
const isStaging = import.meta.env.VITE_FIREBASE_PROJECT_ID === 'boletapp-staging';

// Multi-user email domain - staging uses @boletapp.test, emulator uses @test.local
const MULTI_USER_DOMAIN = isStaging ? 'boletapp.test' : 'test.local';

// Test users matching E2E configuration
const TEST_USERS: TestUser[] = [
  {
    id: 'default',
    email: import.meta.env.VITE_TEST_USER_EMAIL || 'e2e-test@example.com',
    password: import.meta.env.VITE_TEST_USER_PASSWORD || 'e2e-test-password-123',
    displayName: 'Default',
    description: 'From .env config',
    color: '#fbbf24', // amber
  },
  {
    id: 'alice',
    email: `alice@${MULTI_USER_DOMAIN}`,
    password: MULTI_USER_PASSWORD,
    displayName: 'Alice',
    description: 'Group Owner',
    color: '#f472b6', // pink
  },
  {
    id: 'bob',
    email: `bob@${MULTI_USER_DOMAIN}`,
    password: MULTI_USER_PASSWORD,
    displayName: 'Bob',
    description: 'Group Member',
    color: '#60a5fa', // blue
  },
  {
    id: 'charlie',
    email: `charlie@${MULTI_USER_DOMAIN}`,
    password: MULTI_USER_PASSWORD,
    displayName: 'Charlie',
    description: 'Invitee',
    color: '#4ade80', // green
  },
  {
    id: 'diana',
    email: `diana@${MULTI_USER_DOMAIN}`,
    password: MULTI_USER_PASSWORD,
    displayName: 'Diana',
    description: 'Observer',
    color: '#c084fc', // purple
  },
];

export const TestUserMenu: React.FC<TestUserMenuProps> = ({ onSelectUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check if multi-user accounts are available (emulator mode OR staging environment)
  const isMultiUserAvailable = import.meta.env.VITE_E2E_MODE !== 'production' || isStaging;

  // Helper to check if a user is a multi-user account (requires emulator)
  const isMultiUser = (userId: string) => userId !== 'default';

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSelectUser = async (user: TestUser) => {
    setIsLoading(user.id);
    try {
      await onSelectUser(user.email, user.password);
      setIsOpen(false);
    } catch (error) {
      console.error(`Failed to log in as ${user.displayName}:`, error);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div ref={menuRef} className="relative inline-block">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        data-testid="test-login-button"
        className="mt-4 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors hover:bg-amber-500/30"
        style={{
          backgroundColor: 'rgba(251, 191, 36, 0.2)',
          color: '#fbbf24',
        }}
        title="Select test user for development/E2E testing"
      >
        <Users size={16} />
        Test Login
        <ChevronDown
          size={14}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-xl shadow-xl overflow-hidden z-50"
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: '#64748b', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
          >
            Select Test User
          </div>

          {/* User List */}
          <div className="py-1">
            {TEST_USERS.map((user) => {
              const isDisabled = isLoading !== null || (isMultiUser(user.id) && !isMultiUserAvailable);
              const showLockIcon = isMultiUser(user.id) && !isMultiUserAvailable;

              return (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  disabled={isDisabled}
                  data-testid={`test-user-${user.id}`}
                  className="w-full px-4 py-3 flex items-center gap-3 transition-colors hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ color: '#f8fafc' }}
                  title={showLockIcon ? 'Requires emulator mode (VITE_E2E_MODE=emulator)' : undefined}
                >
                  {/* User Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: showLockIcon ? '#475569' : user.color }}
                  >
                    {isLoading === user.id ? (
                      <span className="animate-spin">⏳</span>
                    ) : showLockIcon ? (
                      <span>🔒</span>
                    ) : (
                      <User size={16} />
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 text-left">
                    <div className="font-medium" style={{ color: showLockIcon ? '#64748b' : user.color }}>
                      {user.displayName}
                    </div>
                    <div className="text-xs" style={{ color: '#94a3b8' }}>
                      {showLockIcon ? 'Emulator only' : user.description}
                    </div>
                  </div>

                  {/* Email hint */}
                  <div className="text-xs truncate max-w-20" style={{ color: '#64748b' }}>
                    {user.email.split('@')[0]}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer hint - different message based on mode */}
          <div
            className="px-4 py-2 text-xs"
            style={{
              color: '#64748b',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              backgroundColor: 'rgba(0,0,0,0.2)',
            }}
          >
            {isMultiUserAvailable ? (
              <>✅ {isStaging ? 'Staging' : 'Emulator'} mode - all users available</>
            ) : (
              <>⚠️ Production mode - only Default user works</>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
