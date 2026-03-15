-- Add hazard subcategory classification to posts
ALTER TABLE "posts" ADD COLUMN "hazard_subcategory" text;

-- Add topic category to TBM records
ALTER TABLE "tbm_records" ADD COLUMN "topic_category" text;

-- Add image URL support for quiz questions
ALTER TABLE "quiz_questions" ADD COLUMN "image_url" text;
