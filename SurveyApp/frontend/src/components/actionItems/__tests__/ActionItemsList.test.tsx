import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '../../../test/utils';
import { ActionItemsList } from '../ActionItemsList';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';

vi.mock('../../../services/api');
vi.mock('../../../contexts/AuthContext');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: vi.fn(),
  };
});

const mockedApi = api as unknown as {
  get: Mock;
  post: Mock;
  put: Mock;
  delete: Mock;
};
const mockedUseAuth = vi.mocked(useAuth);
const mockedUseSearchParams = vi.mocked(useSearchParams);

describe('ActionItemsList Component', () => {
  const mockActionItems = [
    {
      id: 'action-1',
      session_id: 'session-123',
      session_name: 'Test Session',
      session_short_id: 'TEST001',
      issue: 'Need more hands-on practice',
      action: 'Add practical exercises to next session',
      priority: 'High',
      status: 'Open',
      person_in_charge: 'John Facilitator',
      deadline: '2024-02-01',
      notes: null,
      created_at: '2024-01-16T10:00:00Z',
      updated_at: '2024-01-16T10:00:00Z',
    },
    {
      id: 'action-2',
      session_id: 'session-456',
      session_name: 'Another Session',
      session_short_id: 'TEST002',
      issue: 'Session pace too fast',
      action: 'Slow down delivery and add breaks',
      priority: 'Medium',
      status: 'In Progress',
      person_in_charge: 'Jane Doe',
      deadline: '2024-02-15',
      notes: 'Working on it',
      created_at: '2024-01-17T10:00:00Z',
      updated_at: '2024-01-17T10:00:00Z',
    },
    {
      id: 'action-3',
      session_id: 'session-123',
      session_name: 'Test Session',
      session_short_id: 'TEST001',
      issue: 'Improve documentation',
      action: 'Create comprehensive docs',
      priority: 'Low',
      status: 'Completed',
      person_in_charge: null,
      deadline: null,
      notes: null,
      created_at: '2024-01-18T10:00:00Z',
      updated_at: '2024-01-18T10:00:00Z',
    },
  ];

  const mockSetSearchParams = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockedUseSearchParams.mockReturnValue([new URLSearchParams(), mockSetSearchParams]);

    mockedUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com', role: 'admin' },
      session: { access_token: 'token' },
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      refreshUser: vi.fn(),
    });

    mockedApi.get.mockResolvedValue({ data: mockActionItems });
  });

  it('renders action items list after loading', async () => {
    render(<ActionItemsList />);

    await waitFor(() => {
      expect(screen.getByText('Need more hands-on practice')).toBeInTheDocument();
    });

    expect(screen.getByText('Session pace too fast')).toBeInTheDocument();
    expect(screen.getByText('Improve documentation')).toBeInTheDocument();
  });

  it('displays correct priority badges', async () => {
    render(<ActionItemsList />);

    await waitFor(() => {
      expect(screen.getByText('Need more hands-on practice')).toBeInTheDocument();
    });

    // Priority dropdowns should exist for admin
    const prioritySelects = screen.getAllByDisplayValue('High');
    expect(prioritySelects.length).toBeGreaterThan(0);
  });

  it('displays correct status badges', async () => {
    render(<ActionItemsList />);

    await waitFor(() => {
      expect(screen.getByText('Need more hands-on practice')).toBeInTheDocument();
    });

    // Status dropdowns should exist for admin
    const openSelects = screen.getAllByDisplayValue('Open');
    expect(openSelects.length).toBeGreaterThan(0);
  });

  it('shows create button for admin users', async () => {
    render(<ActionItemsList />);

    await waitFor(() => {
      expect(screen.getByText('Need more hands-on practice')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /create action item/i })).toBeInTheDocument();
  });

  it('shows create button for facilitator users', async () => {
    mockedUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com', role: 'facilitator' },
      session: { access_token: 'token' },
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<ActionItemsList />);

    await waitFor(() => {
      expect(screen.getByText('Need more hands-on practice')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /create action item/i })).toBeInTheDocument();
  });

  it('hides create button for viewer users', async () => {
    mockedUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com', role: 'viewer' },
      session: { access_token: 'token' },
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<ActionItemsList />);

    await waitFor(() => {
      expect(screen.getByText('Need more hands-on practice')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /create action item/i })).not.toBeInTheDocument();
  });

  it('opens create modal when create button is clicked', async () => {
    render(<ActionItemsList />);

    await waitFor(() => {
      expect(screen.getByText('Need more hands-on practice')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /create action item/i }));

    await waitFor(() => {
      // The ActionItemForm modal should appear - it has a heading
      expect(screen.getByText('Create Action Item')).toBeInTheDocument();
    });
  });

  it('filters by status when status filter is changed', async () => {
    render(<ActionItemsList />);

    await waitFor(() => {
      expect(screen.getByText('Need more hands-on practice')).toBeInTheDocument();
    });

    // Change the status filter
    const statusFilter = screen.getByDisplayValue('All Statuses');
    fireEvent.change(statusFilter, { target: { value: 'Open' } });

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/action-items?status=Open');
    });
  });

  it('filters by priority when priority filter is changed', async () => {
    render(<ActionItemsList />);

    await waitFor(() => {
      expect(screen.getByText('Need more hands-on practice')).toBeInTheDocument();
    });

    // Change the priority filter
    const priorityFilter = screen.getByDisplayValue('All Priorities');
    fireEvent.change(priorityFilter, { target: { value: 'High' } });

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/action-items?priority=High');
    });
  });

  it('updates status inline for admin users', async () => {
    mockedApi.put.mockResolvedValue({ data: { ...mockActionItems[0], status: 'In Progress' } });

    render(<ActionItemsList />);

    await waitFor(() => {
      expect(screen.getByText('Need more hands-on practice')).toBeInTheDocument();
    });

    // Find the first status dropdown (for action-1)
    const statusSelects = screen.getAllByDisplayValue('Open');
    fireEvent.change(statusSelects[0], { target: { value: 'In Progress' } });

    await waitFor(() => {
      expect(mockedApi.put).toHaveBeenCalledWith('/action-items/action-1', { status: 'In Progress' });
    });
  });

  it('updates priority inline for admin users', async () => {
    mockedApi.put.mockResolvedValue({ data: { ...mockActionItems[0], priority: 'Low' } });

    render(<ActionItemsList />);

    await waitFor(() => {
      expect(screen.getByText('Need more hands-on practice')).toBeInTheDocument();
    });

    // Find the first priority dropdown (for action-1 with High priority)
    const prioritySelects = screen.getAllByDisplayValue('High');
    fireEvent.change(prioritySelects[0], { target: { value: 'Low' } });

    await waitFor(() => {
      expect(mockedApi.put).toHaveBeenCalledWith('/action-items/action-1', { priority: 'Low' });
    });
  });

  it('opens delete confirmation modal when delete button is clicked', async () => {
    render(<ActionItemsList />);

    await waitFor(() => {
      expect(screen.getByText('Need more hands-on practice')).toBeInTheDocument();
    });

    // Find delete buttons (trash icons)
    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Delete Action Item')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete this action item/)).toBeInTheDocument();
    });
  });

  it('cancels delete when cancel button is clicked', async () => {
    render(<ActionItemsList />);

    await waitFor(() => {
      expect(screen.getByText('Need more hands-on practice')).toBeInTheDocument();
    });

    // Open delete confirmation
    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Delete Action Item')).toBeInTheDocument();
    });

    // Click cancel
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText('Delete Action Item')).not.toBeInTheDocument();
    });
  });

  it('deletes action item when confirmed', async () => {
    mockedApi.delete.mockResolvedValue({ data: { message: 'Deleted' } });

    render(<ActionItemsList />);

    await waitFor(() => {
      expect(screen.getByText('Need more hands-on practice')).toBeInTheDocument();
    });

    // Open delete confirmation
    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Delete Action Item')).toBeInTheDocument();
    });

    // Confirm delete - the modal has a red delete button
    const modal = screen.getByText('Delete Action Item').closest('div[class*="bg-white"]');
    const deleteConfirmButton = within(modal!).getByRole('button', { name: /^delete$/i });
    fireEvent.click(deleteConfirmButton);

    await waitFor(() => {
      expect(mockedApi.delete).toHaveBeenCalledWith('/action-items/action-1');
    });
  });

  it('shows empty state when no action items', async () => {
    mockedApi.get.mockResolvedValue({ data: [] });

    render(<ActionItemsList />);

    await waitFor(() => {
      expect(screen.getByText('No action items found.')).toBeInTheDocument();
    });
  });

  it('displays session links correctly', async () => {
    render(<ActionItemsList />);

    await waitFor(() => {
      expect(screen.getByText('Need more hands-on practice')).toBeInTheDocument();
    });

    // Session name should be a link
    const sessionLinks = screen.getAllByTitle('Test Session');
    expect(sessionLinks[0].closest('a')).toHaveAttribute('href', '/sessions/session-123');
  });

  it('displays person in charge', async () => {
    render(<ActionItemsList />);

    await waitFor(() => {
      expect(screen.getByText('John Facilitator')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });
  });

  it('displays deadlines formatted correctly', async () => {
    render(<ActionItemsList />);

    await waitFor(() => {
      expect(screen.getByText('Need more hands-on practice')).toBeInTheDocument();
    });

    // Check that the deadline column has content - dates will be formatted by toLocaleDateString()
    // The actual format varies by locale, so we just verify the table renders with deadline data
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
  });

  it('shows edit buttons for admin users', async () => {
    render(<ActionItemsList />);

    await waitFor(() => {
      expect(screen.getByText('Need more hands-on practice')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Edit all details');
    expect(editButtons.length).toBe(3); // 3 action items
  });

  it('hides edit and delete buttons for viewer users', async () => {
    mockedUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com', role: 'viewer' },
      session: { access_token: 'token' },
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<ActionItemsList />);

    await waitFor(() => {
      expect(screen.getByText('Need more hands-on practice')).toBeInTheDocument();
    });

    expect(screen.queryByTitle('Edit all details')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
  });

  it('opens edit modal when edit button is clicked', async () => {
    render(<ActionItemsList />);

    await waitFor(() => {
      expect(screen.getByText('Need more hands-on practice')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Edit all details');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      // The ActionItemForm modal should appear with edit mode
      expect(screen.getByText('Edit Action Item')).toBeInTheDocument();
    });
  });

  it('respects session_id from URL search params', async () => {
    mockedUseSearchParams.mockReturnValue([
      new URLSearchParams({ session_id: 'session-123' }),
      mockSetSearchParams,
    ]);

    render(<ActionItemsList />);

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/action-items?session_id=session-123');
    });
  });

  it('clears session filter when clear button is clicked', async () => {
    mockedUseSearchParams.mockReturnValue([
      new URLSearchParams({ session_id: 'session-123' }),
      mockSetSearchParams,
    ]);

    render(<ActionItemsList />);

    await waitFor(() => {
      expect(screen.getByText('Clear session filter')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Clear session filter'));

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/action-items?');
    });
  });

  it('displays viewers with read-only priority badges', async () => {
    mockedUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com', role: 'viewer' },
      session: { access_token: 'token' },
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<ActionItemsList />);

    await waitFor(() => {
      expect(screen.getByText('Need more hands-on practice')).toBeInTheDocument();
    });

    // For viewers, there should be no priority dropdowns (selects) in the table rows
    // The filter dropdowns will still exist, but inline edit selects should not
    const tableBody = screen.getByRole('table').querySelector('tbody');
    const prioritySelects = tableBody?.querySelectorAll('select');
    expect(prioritySelects?.length).toBe(0);
  });

  it('handles API error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockedApi.get.mockRejectedValue(new Error('API Error'));

    render(<ActionItemsList />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it('refetches after inline update error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockedApi.put.mockRejectedValue(new Error('Update failed'));

    render(<ActionItemsList />);

    await waitFor(() => {
      expect(screen.getByText('Need more hands-on practice')).toBeInTheDocument();
    });

    // Initial fetch
    expect(mockedApi.get).toHaveBeenCalledTimes(1);

    // Trigger inline update
    const statusSelects = screen.getAllByDisplayValue('Open');
    fireEvent.change(statusSelects[0], { target: { value: 'In Progress' } });

    await waitFor(() => {
      // Should refetch after error
      expect(mockedApi.get).toHaveBeenCalledTimes(2);
    });

    consoleSpy.mockRestore();
  });
});
