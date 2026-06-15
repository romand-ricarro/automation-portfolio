import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/utils';
import { ActionItemForm } from '../ActionItemForm';
import api from '../../../services/api';

vi.mock('../../../services/api');
const mockedApi = api as unknown as { get: Mock; post: Mock; put: Mock; patch: Mock; delete: Mock };

describe('ActionItemForm Component', () => {
  const mockOnSuccess = vi.fn();
  const mockOnClose = vi.fn();
  const mockSessionId = 'test-session-id';

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock API calls for loading sessions and common issues
    mockedApi.get.mockResolvedValue({ data: [] });
  });

  it('renders form with title and buttons', async () => {
    render(
      <ActionItemForm
        sessionId={mockSessionId}
        onSuccess={mockOnSuccess}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('New Action Item')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /save action item/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('renders form fields with labels', async () => {
    render(
      <ActionItemForm
        sessionId={mockSessionId}
        onSuccess={mockOnSuccess}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Issue')).toBeInTheDocument();
    });
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Person in Charge')).toBeInTheDocument();
    expect(screen.getByText('Deadline')).toBeInTheDocument();
  });

  it('submits form when save button is clicked', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        id: 'new-item-id',
        issue: 'Test Issue',
        action: 'Test Action',
        priority: 'High',
      },
    });

    render(
      <ActionItemForm
        sessionId={mockSessionId}
        onSuccess={mockOnSuccess}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('New Action Item')).toBeInTheDocument();
    });

    // Find and fill Issue textarea
    const issueTextarea = screen.getAllByRole('textbox')[0];
    fireEvent.change(issueTextarea, { target: { value: 'Test Issue' } });

    // Find and fill Action textarea
    const actionTextarea = screen.getAllByRole('textbox')[1];
    fireEvent.change(actionTextarea, { target: { value: 'Test Action' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /save action item/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalled();
    });
  });

  it('calls onClose when cancel button is clicked', async () => {
    render(
      <ActionItemForm
        sessionId={mockSessionId}
        onSuccess={mockOnSuccess}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('New Action Item')).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows Edit title when initialData is provided', async () => {
    const existingItem = {
      id: 'item-id',
      issue: 'Existing Issue',
      action: 'Existing Action',
      priority: 'Medium' as const,
      person_in_charge: 'Jane Doe',
      status: 'Open' as const,
    };

    render(
      <ActionItemForm
        sessionId={mockSessionId}
        initialData={existingItem}
        onSuccess={mockOnSuccess}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Edit Action Item')).toBeInTheDocument();
    });
  });
});
