-- Add AI analysis columns to education_contents table
ALTER TABLE education_contents ADD COLUMN ai_analysis TEXT;
ALTER TABLE education_contents ADD COLUMN ai_analyzed_at TEXT;
