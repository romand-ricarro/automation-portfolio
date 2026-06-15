export type UserRole = 'admin' | 'facilitator' | 'viewer';

export interface User {
    id: string;
    email: string;
    name?: string;
    profile_picture_url?: string;
    role: UserRole;
    last_login_at?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Session {
    id: string;
    session_id: string;
    session_name: string;
    session_date: string;
    facilitator_name: string;
    num_responses: number;
    status: 'pending' | 'analyzed';
    created_at: string;
    ratings?: SessionRatings;
    common_issues?: CommonIssue[];
    analyzed_at?: string;
}

export interface SessionRatings {
    id: string;
    session_id: string;
    facilitator_understanding: number;
    learning_mechanics: number;
    qa_support: number;
    problem_articulation: number;
    session_pace: number;
    tools_helpfulness: number;
    repeatability: number;
    learning_objectives: number;
    overall_quality: number;
}

export interface QuestionAnalysis {
    id: string;
    session_id: string;
    question_label: string;
    question_text: string;
    analysis_text: string;
    created_at: string;
}

export type CommonIssueStatus = 'pending' | 'acknowledged';

export interface CommonIssue {
    id: string;
    session_id: string;
    common_issue: string;
    evidence_signal: string;
    display_order: number;
    status: CommonIssueStatus;
}

export type ActionItemPriority = 'High' | 'Medium' | 'Low';
export type ActionItemStatus = 'Open' | 'In Progress' | 'Completed' | 'On Hold';

export interface ActionItem {
    id: string;
    session_id: string;
    issue: string;
    action: string;
    priority: ActionItemPriority;
    person_in_charge?: string;
    deadline?: string;
    status: ActionItemStatus;
    notes?: string;
    created_at: string;
    created_by?: string;
    // Session metadata (included from backend when fetching action items)
    session_name?: string;
    session_short_id?: string;
    session_date?: string;
    // RBAC: Flag indicating if this item is assigned from another session
    is_assigned?: boolean;
    // Approval workflow
    approved_at?: string;
    approved_by?: string;
    approver_name?: string;
}

export interface DashboardStats {
    total_sessions: number;
    open_action_items: number;
    in_progress_action_items: number;
    average_repeatability: number;
    recent_sessions: Session[];
    // RBAC: indicates if stats are personal (facilitator) or global (admin/viewer)
    scope?: 'personal' | 'global';
}

export interface ComparisonData {
    facilitator_name: string;
    metrics: Record<string, number>;
    session_count: number;
}

export interface BenchmarkData {
    session: Record<string, number>;
    facilitator_avg: Record<string, number>;
    global_avg: Record<string, number>;
    facilitator_name: string;
    session_name: string;
}

export interface FacilitatorHistory {
    session_id: string;
    session_name: string;
    date: string;
    num_responses: number;
    facilitator_understanding: number | null;
    learning_mechanics: number | null;
    qa_support: number | null;
    problem_articulation: number | null;
    session_pace: number | null;
    tools_helpfulness: number | null;
    repeatability: number | null;
    learning_objectives: number | null;
    overall_quality: number | null;
}
