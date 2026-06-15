-- Users
INSERT INTO users (id, email, name, role) VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'test@example.com', 'Admin User', 'admin'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'facilitator1@example.com', 'Facilitator One', 'facilitator'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'facilitator2@example.com', 'Facilitator Two', 'facilitator'),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'viewer@example.com', 'Viewer User', 'viewer');

-- Sessions
INSERT INTO sessions (id, session_id, session_name, session_date, facilitator_name, num_responses, status, created_by) VALUES
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'GBLr335E', 'Leadership Alpha', '2023-11-15', 'Xin Zhou', 12, 'analyzed', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'iYzUGAtr', 'Communication Beta', '2023-11-20', 'Xin Zhou', 15, 'pending', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- Question Analyses (for analyzed session)
INSERT INTO question_analyses (session_id, question_label, question_text, analysis_text) VALUES
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'What did you learn in this session?', 'What did you learn in this session?', '- The importance of active listening (5 mentions)\n- How to give constructive feedback (3 mentions)\n- Delegation strategies (4 mentions)\n\n**Key Insight:** Participants valued the practical tools for feedback the most.');

-- Common Issues
INSERT INTO common_issues (session_id, common_issue, evidence_signal, display_order) VALUES
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Pace was too fast', 'Several participants mentioned they struggled to keep up during the workshop exercises.', 1),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Audio issues', 'Two participants noted microphone static during the Q&A.', 2);

-- Action Items
INSERT INTO action_items (session_id, issue, action, priority, person_in_charge, deadline, status, created_by) VALUES
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Pace was too fast', 'Extend the workshop duration by 30 mins for next session.', 'High', 'Xin Zhou', '2023-12-01', 'Open', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Audio issues', 'Replace faulty microphone.', 'Medium', 'IT Support', '2023-11-25', 'Completed', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22');

-- Ratings
INSERT INTO session_ratings (session_id, facilitator_understanding, learning_mechanics, qa_support, problem_articulation, session_pace, tools_helpfulness, repeatability, learning_objectives, overall_quality) VALUES
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 9.2, 8.5, 9.0, 8.8, 7.5, 8.9, 9.5, 9.0, 9.1);
