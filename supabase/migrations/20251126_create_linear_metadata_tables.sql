-- Create table for Linear Projects
CREATE TABLE IF NOT EXISTS linear_projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    state TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create table for Linear Labels
CREATE TABLE IF NOT EXISTS linear_labels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create table for Linear Milestones (Cycles)
CREATE TABLE IF NOT EXISTS linear_milestones (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    target_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS (Optional, but good practice)
ALTER TABLE linear_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_milestones ENABLE ROW LEVEL SECURITY;

-- Create policies (Adjust as needed, currently allowing public read for simplicity in this context)
CREATE POLICY "Public read access" ON linear_projects FOR SELECT USING (true);
CREATE POLICY "Public read access" ON linear_labels FOR SELECT USING (true);
CREATE POLICY "Public read access" ON linear_milestones FOR SELECT USING (true);

-- Allow service role to write (implicit, but explicit policies can be added if needed)
