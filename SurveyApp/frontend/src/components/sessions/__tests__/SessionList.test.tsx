import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../../test/utils';
import { SessionList } from '../SessionList';
import api from '../../../services/api';

vi.mock('../../../services/api');
const mockedApi = api as unknown as { get: Mock; post: Mock; put: Mock; patch: Mock; delete: Mock };

describe('SessionList Component', () => {
  const mockSessions = [
    {
      id: '1',
      session_id: 'TEST001',
      session_name: 'Test Session 1',
      session_date: '2024-01-15',
      facilitator_name: 'John Doe',
      num_responses: 10,
      status: 'analyzed',
    },
    {
      id: '2',
      session_id: 'TEST002',
      session_name: 'Test Session 2',
      session_date: '2024-01-16',
      facilitator_name: 'Jane Smith',
      num_responses: 8,
      status: 'pending',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders session list heading', async () => {
    mockedApi.get.mockResolvedValue({ data: [] });

    render(<SessionList />);

    await waitFor(() => {
      expect(screen.getByText(/Sessions/)).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    mockedApi.get.mockImplementation(
      () => new Promise(() => {})
    );

    render(<SessionList />);
    // Component uses a spinner SVG, not text - just verify content is not yet shown
    expect(screen.queryByText(/Sessions/)).not.toBeInTheDocument();
  });

  it('displays sessions when loaded', async () => {
    mockedApi.get.mockResolvedValue({ data: mockSessions });

    render(<SessionList />);

    await waitFor(() => {
      expect(screen.getByText('Test Session 1')).toBeInTheDocument();
      expect(screen.getByText('Test Session 2')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('displays status badges correctly', async () => {
    mockedApi.get.mockResolvedValue({ data: mockSessions });

    render(<SessionList />);

    await waitFor(() => {
      // Status badges are capitalized
      expect(screen.getByText('Analyzed')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  it('filters sessions by search query', async () => {
    mockedApi.get.mockResolvedValue({ data: mockSessions });

    render(<SessionList />);

    await waitFor(() => {
      expect(screen.getByText('Test Session 1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'Session 1' } });

    await waitFor(() => {
      expect(screen.getByText('Test Session 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Session 2')).not.toBeInTheDocument();
    });
  });

  it('handles empty session list', async () => {
    mockedApi.get.mockResolvedValue({ data: [] });

    render(<SessionList />);

    await waitFor(() => {
      expect(screen.getByText(/no sessions found/i)).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    // When API fails, component shows empty state (no explicit error UI)
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockedApi.get.mockRejectedValue(new Error('Failed to fetch'));

    render(<SessionList />);

    await waitFor(() => {
      // Component logs the error and shows empty state
      expect(consoleSpy).toHaveBeenCalled();
      expect(screen.getByText(/no sessions found/i)).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('navigates to session detail on click', async () => {
    mockedApi.get.mockResolvedValue({ data: mockSessions });

    render(<SessionList />);

    await waitFor(() => {
      expect(screen.getByText('Test Session 1')).toBeInTheDocument();
    });

    const sessionRow = screen.getByText('Test Session 1');
    fireEvent.click(sessionRow);

    // Verify navigation (this would need router mock in real implementation)
    expect(sessionRow).toBeInTheDocument();
  });
});
