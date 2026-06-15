import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../../test/utils';
import { SessionDetail } from '../SessionDetail';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';

vi.mock('../../../services/api');
vi.mock('../../../contexts/AuthContext');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
    useNavigate: vi.fn(),
  };
});

const mockedApi = api as unknown as {
  get: Mock;
  post: Mock;
  put: Mock;
  patch: Mock;
  delete: Mock;
};
const mockedUseAuth = vi.mocked(useAuth);
const mockedUseParams = vi.mocked(useParams);
const mockedUseNavigate = vi.mocked(useNavigate);

describe('SessionDetail Component', () => {
  const mockSession = {
    id: 'session-123',
    session_id: 'TEST001',
    session_name: 'Test Session',
    session_date: '2024-01-15',
    facilitator_name: 'John Facilitator',
    num_responses: 25,
    status: 'analyzed',
    analyzed_at: '2024-01-15T12:00:00Z',
  };

  const mockAnalyses = [
    {
      id: 'analysis-1',
      question_label: 'learned',
      question_text: 'What did you learn?',
      analysis_text: 'Key learnings from the session...',
    },
  ];

  const mockCommonIssues = [
    {
      id: 'issue-1',
      common_issue: 'Need more practice',
      evidence_signal: 'Mentioned by 8 respondents',
      display_order: 1,
    },
  ];

  const mockRatings = {
    overall_quality: 4.5,
    facilitator_understanding: 4.2,
    repeatability: 4.0,
    learning_mechanics: 4.1,
  };

  const mockActionItems: { id: string; session_id: string; issue: string; action: string; priority: string; status: string }[] = [];

  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockedUseParams.mockReturnValue({ id: 'session-123' });
    mockedUseNavigate.mockReturnValue(mockNavigate);

    mockedUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com', role: 'admin' },
      session: { access_token: 'token' },
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      refreshUser: vi.fn(),
    });

    // Setup API mocks
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/sessions/session-123') {
        return Promise.resolve({ data: mockSession });
      }
      if (url === '/sessions/session-123/analyses') {
        return Promise.resolve({ data: mockAnalyses });
      }
      if (url === '/sessions/session-123/common-issues') {
        return Promise.resolve({ data: mockCommonIssues });
      }
      if (url === '/sessions/session-123/ratings') {
        return Promise.resolve({ data: mockRatings });
      }
      if (url.includes('/action-items')) {
        return Promise.resolve({ data: mockActionItems });
      }
      if (url === '/sessions') {
        return Promise.resolve({ data: [mockSession] });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('renders session details after loading', async () => {
    render(<SessionDetail />);

    await waitFor(() => {
      expect(screen.getByText('Test Session')).toBeInTheDocument();
    });

    expect(screen.getByText(/John Facilitator/)).toBeInTheDocument();
    expect(screen.getByText(/25 responses/)).toBeInTheDocument();
  });

  it('displays session ratings', async () => {
    render(<SessionDetail />);

    await waitFor(() => {
      expect(screen.getByText('4.5')).toBeInTheDocument(); // overall_quality
    });
  });

  it('shows analysis button for admin users', async () => {
    render(<SessionDetail />);

    await waitFor(() => {
      expect(screen.getByText('Test Session')).toBeInTheDocument();
    });

    // Admin should see the analysis button
    expect(screen.getByRole('button', { name: /re-run ai analysis/i })).toBeInTheDocument();
  });

  it('hides analysis button for non-admin users', async () => {
    mockedUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com', role: 'viewer' },
      session: { access_token: 'token' },
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<SessionDetail />);

    await waitFor(() => {
      expect(screen.getByText('Test Session')).toBeInTheDocument();
    });

    // Viewer should not see the analysis button
    expect(screen.queryByRole('button', { name: /run ai analysis/i })).not.toBeInTheDocument();
  });

  it('displays export buttons for analyzed sessions', async () => {
    render(<SessionDetail />);

    await waitFor(() => {
      expect(screen.getByText('Test Session')).toBeInTheDocument();
    });

    // Export buttons should be visible for analyzed session
    expect(screen.getByRole('button', { name: /pdf/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /excel/i })).toBeInTheDocument();
  });

  it('shows last analyzed timestamp', async () => {
    render(<SessionDetail />);

    await waitFor(() => {
      expect(screen.getByText(/last analyzed/i)).toBeInTheDocument();
    });
  });

  it('allows session name editing for admins', async () => {
    render(<SessionDetail />);

    await waitFor(() => {
      expect(screen.getByText('Test Session')).toBeInTheDocument();
    });

    // Find and click the edit button (Edit2 icon)
    const editButton = screen.getByTitle('Rename session');
    fireEvent.click(editButton);

    // Input should appear
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Session')).toBeInTheDocument();
    });
  });

  it('displays common issues', async () => {
    render(<SessionDetail />);

    await waitFor(() => {
      expect(screen.getByText('Need more practice')).toBeInTheDocument();
    });
  });

  it('displays question analyses', async () => {
    render(<SessionDetail />);

    await waitFor(() => {
      // The QuestionAnalyses component displays tabs based on question_label
      // 'learned' becomes 'Learned' tab
      expect(screen.getByText('Learned')).toBeInTheDocument();
    });
  });

  it('handles session not found', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/sessions/session-123') {
        return Promise.reject({ response: { status: 404 } });
      }
      return Promise.resolve({ data: [] });
    });

    render(<SessionDetail />);

    await waitFor(() => {
      expect(screen.getByText(/session not found/i)).toBeInTheDocument();
    });
  });

  it('navigates back to sessions list', async () => {
    render(<SessionDetail />);

    await waitFor(() => {
      expect(screen.getByText('Test Session')).toBeInTheDocument();
    });

    const backLink = screen.getByText(/back to sessions/i);
    expect(backLink).toBeInTheDocument();
    expect(backLink.closest('a')).toHaveAttribute('href', '/sessions');
  });
});
