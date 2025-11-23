-- Enable the pgvector extension to work with embedding vectors (if needed later)
create extension if not exists vector;

-- Create table for Linear Issues
create table if not exists linear_issues (
  id text primary key,
  identifier text not null, -- e.g., LIN-123
  title text not null,
  description text,
  state text not null,
  priority integer,
  priority_label text,
  assignee_id text,
  assignee_name text,
  project_name text,
  team_name text,
  labels text[], -- Array of label names
  due_date timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  url text
);

-- Create table for Comments
create table if not exists linear_comments (
  id text primary key,
  issue_id text references linear_issues(id) on delete cascade,
  body text not null,
  user_name text,
  created_at timestamp with time zone
);

-- Enable Row Level Security (RLS)
alter table linear_issues enable row level security;
alter table linear_comments enable row level security;

-- Create policies (Adjust as needed, currently allowing read access to everyone for demo)
create policy "Allow public read access" on linear_issues for select using (true);
create policy "Allow public read access" on linear_comments for select using (true);

-- Allow service_role to do everything (Webhooks use service_role)
create policy "Allow service_role full access" on linear_issues using (auth.role() = 'service_role');
create policy "Allow service_role full access" on linear_comments using (auth.role() = 'service_role');
