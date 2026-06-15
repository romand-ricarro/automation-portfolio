/**
 * MSW request handlers for mocking API responses in tests.
 */
import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:8000/api';

// Mock data
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'admin',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockSession = {
  id: 'session-123',
  session_id: 'TEST001',
  session_name: 'Test Session',
  session_date: '2024-01-15',
  facilitator_name: 'John Facilitator',
  num_responses: 25,
  status: 'analyzed',
  created_at: '2024-01-15T10:00:00Z',
  analyzed_at: '2024-01-15T12:00:00Z',
  ratings: {
    overall_quality: 4.5,
    facilitator_understanding: 4.2,
    learning_mechanics: 4.0,
    qa_support: 4.3,
    problem_articulation: 4.1,
    session_pace: 4.4,
    tools_helpfulness: 4.0,
    repeatability: 4.2,
    learning_objectives: 4.3,
  },
  common_issues: [],
};

export const mockSessions = [
  mockSession,
  {
    ...mockSession,
    id: 'session-456',
    session_id: 'TEST002',
    session_name: 'Another Session',
    status: 'pending',
  },
];

export const mockQuestionAnalyses = [
  {
    id: 'analysis-1',
    session_id: 'session-123',
    question_label: 'learned',
    question_text: 'What did you learn in this session?',
    analysis_text: '**Key Learnings:**\n- 15 respondents mentioned improved understanding of concepts\n- 8 respondents highlighted practical skills gained',
    created_at: '2024-01-15T12:00:00Z',
  },
  {
    id: 'analysis-2',
    session_id: 'session-123',
    question_label: 'apply',
    question_text: 'How can you apply what you learned?',
    analysis_text: '**Application Plans:**\n- 12 respondents plan to implement in daily work\n- 10 respondents will share with team',
    created_at: '2024-01-15T12:00:00Z',
  },
];

export const mockCommonIssues = [
  {
    id: 'issue-1',
    session_id: 'session-123',
    common_issue: 'Need more hands-on practice',
    evidence_signal: 'Mentioned by 8 respondents',
    display_order: 1,
  },
  {
    id: 'issue-2',
    session_id: 'session-123',
    common_issue: 'Session pace too fast',
    evidence_signal: 'Mentioned by 5 respondents',
    display_order: 2,
  },
];

export const mockActionItems = [
  {
    id: 'action-1',
    session_id: 'session-123',
    issue: 'Need more hands-on practice',
    action: 'Add practical exercises to next session',
    priority: 'High',
    person_in_charge: 'John Facilitator',
    deadline: '2024-02-01',
    status: 'Open',
    notes: null,
    created_at: '2024-01-16T10:00:00Z',
    updated_at: '2024-01-16T10:00:00Z',
  },
];

export const mockDashboardStats = {
  total_sessions: 15,
  total_responses: 450,
  sessions_analyzed: 12,
  avg_overall_rating: 4.3,
  recent_sessions: mockSessions.slice(0, 3),
};

// Handlers
export const handlers = [
  // Auth endpoints
  http.get(`${API_URL}/users/me`, () => {
    return HttpResponse.json(mockUser);
  }),

  // Sessions endpoints
  http.get(`${API_URL}/sessions`, () => {
    return HttpResponse.json(mockSessions);
  }),

  http.get(`${API_URL}/sessions/:id`, ({ params }) => {
    const session = mockSessions.find((s) => s.id === params.id);
    if (session) {
      return HttpResponse.json(session);
    }
    return HttpResponse.json({ error: 'Session not found' }, { status: 404 });
  }),

  http.patch(`${API_URL}/sessions/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    const session = mockSessions.find((s) => s.id === params.id);
    if (session) {
      return HttpResponse.json({ ...session, ...body });
    }
    return HttpResponse.json({ error: 'Session not found' }, { status: 404 });
  }),

  http.post(`${API_URL}/sessions/import`, () => {
    return HttpResponse.json({ message: 'Imported 5 sessions', imported_new: 2 });
  }),

  http.post(`${API_URL}/sessions/:id/analyze`, ({ params }) => {
    return HttpResponse.json({ message: 'Analysis complete' });
  }),

  http.delete(`${API_URL}/sessions/:id`, ({ params }) => {
    return HttpResponse.json({ message: 'Session deleted successfully' });
  }),

  // Analyses endpoints
  http.get(`${API_URL}/sessions/:id/analyses`, () => {
    return HttpResponse.json(mockQuestionAnalyses);
  }),

  http.get(`${API_URL}/sessions/:id/common-issues`, () => {
    return HttpResponse.json(mockCommonIssues);
  }),

  http.get(`${API_URL}/sessions/:id/ratings`, () => {
    return HttpResponse.json(mockSession.ratings);
  }),

  // Action items endpoints
  http.get(`${API_URL}/action-items`, ({ request }) => {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');
    if (sessionId) {
      return HttpResponse.json(
        mockActionItems.filter((a) => a.session_id === sessionId)
      );
    }
    return HttpResponse.json(mockActionItems);
  }),

  http.post(`${API_URL}/action-items`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(
      {
        id: 'new-action-id',
        ...body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  http.put(`${API_URL}/action-items/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      id: params.id,
      ...mockActionItems[0],
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),

  http.delete(`${API_URL}/action-items/:id`, () => {
    return HttpResponse.json({ message: 'Action item deleted' });
  }),

  // Dashboard endpoints
  http.get(`${API_URL}/dashboard/stats`, () => {
    return HttpResponse.json(mockDashboardStats);
  }),

  http.get(`${API_URL}/dashboard/facilitator-performance`, () => {
    return HttpResponse.json([
      {
        facilitator_name: 'John Facilitator',
        session_count: 5,
        avg_rating: 4.5,
      },
    ]);
  }),

  // Users endpoints
  http.get(`${API_URL}/users`, () => {
    return HttpResponse.json([mockUser]);
  }),

  // Export endpoints
  http.get(`${API_URL}/sessions/:id/export/pdf`, () => {
    return new HttpResponse(new Blob(['PDF content'], { type: 'application/pdf' }), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="report.pdf"',
      },
    });
  }),

  http.get(`${API_URL}/sessions/:id/export/excel`, () => {
    return new HttpResponse(
      new Blob(['Excel content'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      {
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="report.xlsx"',
        },
      }
    );
  }),

  // Notifications endpoints
  http.get(`${API_URL}/notifications/preferences`, () => {
    return HttpResponse.json({
      id: 'pref-1',
      user_id: 'user-123',
      analysis_complete: true,
      action_item_assigned: true,
      action_item_reminder: true,
      weekly_digest: false,
      email_override: null,
    });
  }),

  http.put(`${API_URL}/notifications/preferences`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      id: 'pref-1',
      user_id: 'user-123',
      ...body,
    });
  }),

  // Prompts endpoints
  http.get(`${API_URL}/prompts`, () => {
    return HttpResponse.json([
      {
        id: 'prompt-1',
        name: 'Question Analysis',
        slug: 'question_analysis',
        version: 1,
        is_active: true,
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]);
  }),
];
