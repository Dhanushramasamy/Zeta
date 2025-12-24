-- Create table for Linear Issues if not exists
CREATE TABLE IF NOT EXISTS linear_issues (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    state TEXT,
    priority INTEGER,
    priority_label TEXT,
    assignee_id TEXT,
    assignee_name TEXT,
    project_name TEXT,
    team_name TEXT,
    labels TEXT[], -- Array of labels
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    url TEXT,
    mentions_dhanush BOOLEAN DEFAULT FALSE
);

-- Create table for Linear Comments if not exists
CREATE TABLE IF NOT EXISTS linear_comments (
    id TEXT PRIMARY KEY,
    issue_id TEXT REFERENCES linear_issues(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    user_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    mentions_dhanush BOOLEAN DEFAULT FALSE
);

-- Create indices for fast searching
CREATE INDEX IF NOT EXISTS idx_linear_issues_project_name ON linear_issues (project_name);
CREATE INDEX IF NOT EXISTS idx_linear_issues_due_date ON linear_issues (due_date);
CREATE INDEX IF NOT EXISTS idx_linear_issues_priority ON linear_issues (priority);
CREATE INDEX IF NOT EXISTS idx_linear_issues_assignee_name ON linear_issues (assignee_name);
CREATE INDEX IF NOT EXISTS idx_linear_issues_mentions_dhanush ON linear_issues (mentions_dhanush);
CREATE INDEX IF NOT EXISTS idx_linear_comments_mentions_dhanush ON linear_comments (mentions_dhanush);

-- Enable RLS
ALTER TABLE linear_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (or adjust as needed)
CREATE POLICY "Public read access for issues" ON linear_issues FOR SELECT USING (true);
CREATE POLICY "Public read access for comments" ON linear_comments FOR SELECT USING (true);
