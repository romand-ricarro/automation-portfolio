import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import { Dashboard } from '../Dashboard';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

// Mock the api module
vi.mock('../../../services/api');
const mockedApi = api as unknown as { get: Mock; post: Mock; put: Mock; patch: Mock; delete: Mock };

// Mock useAuth
vi.mock('../../../contexts/AuthContext');
const mockedUseAuth = vi.mocked(useAuth);

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@test.com', name: 'Test User', role: 'admin', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      session: null,
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      refreshUser: vi.fn(),
    });
  });

  it('renders dashboard heading', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        total_sessions: 0,
        open_action_items: 0,
        in_progress_action_items: 0,
        average_repeatability: 0,
        recent_sessions: [],
      },
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    });
  });

  it('displays loading state', () => {
    mockedApi.get.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<Dashboard />);
    // LoadingSpinner should be visible
    expect(screen.queryByText(/Dashboard/i)).not.toBeInTheDocument();
  });

  it('displays dashboard statistics when loaded', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        total_sessions: 25,
        open_action_items: 5,
        in_progress_action_items: 3,
        average_repeatability: 4.5,
        recent_sessions: [],
      },
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('handles error state', async () => {
    mockedApi.get.mockRejectedValue(new Error('API Error'));

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load dashboard/i)).toBeInTheDocument();
    });
  });

  it('displays recent sessions', async () => {
    const mockSessions = [
      {
        id: '1',
        session_id: 'TEST001',
        session_name: 'Test Session 1',
        session_date: '2024-01-15',
        facilitator_name: 'John Doe',
        status: 'analyzed',
      },
      {
        id: '2',
        session_id: 'TEST002',
        session_name: 'Test Session 2',
        session_date: '2024-01-16',
        facilitator_name: 'Jane Smith',
        status: 'pending',
      },
    ];

    mockedApi.get.mockResolvedValue({
      data: {
        total_sessions: 2,
        open_action_items: 0,
        in_progress_action_items: 0,
        average_repeatability: 4.5,
        recent_sessions: mockSessions,
      },
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Test Session 1')).toBeInTheDocument();
      expect(screen.getByText('Test Session 2')).toBeInTheDocument();
    });
  });
});
