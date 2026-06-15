import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../contexts/ThemeContext';
import { vi } from 'vitest';

// Create a mock AuthContext for testing
const AuthContext = React.createContext<{
  user: any;
  session: any;
  loading: boolean;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<any>;
  refreshUser: () => Promise<void>;
} | null>(null);

// Mock auth context value
export const mockAuthContext = {
  user: null,
  session: null,
  loading: false,
  signOut: vi.fn(),
  signInWithGoogle: vi.fn(),
  refreshUser: vi.fn(),
};

// Mock AuthProvider for tests
const MockAuthProvider = ({ children }: { children: ReactNode }) => {
  return (
    <AuthContext.Provider value={mockAuthContext}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom render function that includes providers
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <BrowserRouter>
        <ThemeProvider>
          <MockAuthProvider>{children}</MockAuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    ),
    ...options,
  });
}

export * from '@testing-library/react';
export { customRender as render };
