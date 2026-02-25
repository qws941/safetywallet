-- Quiz question types: OX, SINGLE_CHOICE, MULTI_CHOICE, SHORT_ANSWER
-- Education external source: LOCAL, YOUTUBE, KOSHA

-- Add questionType to quiz_questions (default SINGLE_CHOICE for existing rows)
ALTER TABLE quiz_questions ADD COLUMN question_type TEXT NOT NULL DEFAULT 'SINGLE_CHOICE';

-- Change correct_answer semantics: keep integer column, add text column for flexible answers
-- For MULTI_CHOICE: JSON array of indices, For SHORT_ANSWER: text answer
ALTER TABLE quiz_questions ADD COLUMN correct_answer_text TEXT;

-- Add external source tracking to education_contents
ALTER TABLE education_contents ADD COLUMN external_source TEXT NOT NULL DEFAULT 'LOCAL';
ALTER TABLE education_contents ADD COLUMN external_id TEXT;
ALTER TABLE education_contents ADD COLUMN source_url TEXT;
