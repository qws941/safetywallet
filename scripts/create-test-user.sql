-- Test users generated at 2026-02-08T02:54:27.535Z
-- Login credentials:
--   Name: 테스트관리자, Phone: 01099990001, DOB: 19900101, Role: ADMIN
--   Name: 테스트작업자, Phone: 01099990002, DOB: 19900202, Role: WORKER

BEGIN TRANSACTION;

DELETE FROM users WHERE phone_hash = 'de29b0c60deb01b25473a14e59c6de8f90e7d9d0449a1c8811f1de0e1d67e5ea';
INSERT INTO users (id, phone, phone_hash, dob, dob_hash, name, name_masked, role, created_at, updated_at) VALUES ('534eb4541ceb41549c280ccda', '01099990001', 'de29b0c60deb01b25473a14e59c6de8f90e7d9d0449a1c8811f1de0e1d67e5ea', '19900101', '0c036c6215f5d0befa6ae7460d6392441de293769da3cac38bf4bb27ec79f9a3', '테스트관리자', '테****자', 'ADMIN', '2026-02-08T02:54:27.535Z', '2026-02-08T02:54:27.535Z');
INSERT OR REPLACE INTO refresh_tokens (id, user_id, token, expires_at, created_at) VALUES ('2cf7c887f78a4ab6a7805203e', '534eb4541ceb41549c280ccda', 'e558aea6-f19f-43cd-bae5-3f5b116958b7', '2026-03-10T02:54:27.536Z', '2026-02-08T02:54:27.535Z');

DELETE FROM users WHERE phone_hash = '1718bf46f6cf8735d560fa8326a6ada58dc82c73e5cfce0cb2b2ad16c240d733';
INSERT INTO users (id, phone, phone_hash, dob, dob_hash, name, name_masked, role, created_at, updated_at) VALUES ('f345a1c0cb404496a286786ce', '01099990002', '1718bf46f6cf8735d560fa8326a6ada58dc82c73e5cfce0cb2b2ad16c240d733', '19900202', 'dde82bb1c9b9f306663e550f12a46d191f6a6cf599cd614a1afab4a7fbd4fa71', '테스트작업자', '테****자', 'WORKER', '2026-02-08T02:54:27.535Z', '2026-02-08T02:54:27.535Z');
INSERT OR REPLACE INTO refresh_tokens (id, user_id, token, expires_at, created_at) VALUES ('82941383304944e9800a3f003', 'f345a1c0cb404496a286786ce', '24c04713-13c3-486b-9afa-4d915e3c99b5', '2026-03-10T02:54:27.536Z', '2026-02-08T02:54:27.535Z');

COMMIT;