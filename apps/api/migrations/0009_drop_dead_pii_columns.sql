-- Drop dead plaintext PII columns from users table
-- These are replaced by phoneEncrypted/phoneHash and dobEncrypted/dobHash
-- Must drop the unique index on phone first (SQLite constraint)
DROP INDEX IF EXISTS users_phone_unique;
ALTER TABLE users DROP COLUMN phone;
ALTER TABLE users DROP COLUMN dob;
