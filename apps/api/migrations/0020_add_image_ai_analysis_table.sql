-- Create image_ai_analysis table for Gemini hazard image analysis results
CREATE TABLE IF NOT EXISTS image_ai_analysis (
  id TEXT PRIMARY KEY,
  post_image_id TEXT NOT NULL REFERENCES post_images(id),
  post_id TEXT NOT NULL REFERENCES posts(id),
  hazard_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT NOT NULL,
  recommendations TEXT,
  detected_objects TEXT,
  confidence INTEGER,
  related_regulations TEXT,
  raw_response TEXT,
  model_version TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
  analyzed_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS image_ai_analysis_post_image_id_idx ON image_ai_analysis(post_image_id);
CREATE INDEX IF NOT EXISTS image_ai_analysis_post_id_idx ON image_ai_analysis(post_id);
