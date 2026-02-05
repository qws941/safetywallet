-- SafetyWallet D1 Seed Data
-- Generated for test accounts
-- Usage: npx wrangler d1 execute safework2-db --file=./seed.sql

-- ============================================
-- Test Users
-- ============================================
-- Phone/DOB hashes generated with HMAC-SHA256, secret: 'default-hmac-secret'

INSERT OR REPLACE INTO users (
    id, phone, phone_hash, name, name_masked, dob, dob_hash, 
    role, pii_view_full, can_award_points, can_manage_users,
    created_at, updated_at
) VALUES 
-- 김선민 (WORKER) - 일반 작업자
(
    'test_user_worker_1',
    '11111111111',
    '0752bf2301d3a0900378c2f6799a3e4808823d91035a17d68017cd049df039f7',
    '김선민',
    '김*민',
    '19900101',
    '1eba84d5bc63fccf16f505337f291ffaa36fa4c8ab95a7f83342cab53e84b330',
    'WORKER',
    0, 0, 0,
    datetime('now'), datetime('now')
),
-- 이철수 (WORKER) - 2번째 작업자
(
    'test_user_worker_2',
    '22222222222',
    'a2ab67d52a9a9f16eca8d3b9f467aaa1b46074bed69fa2a5d99379aa866e7947',
    '이철수',
    '이*수',
    '19850515',
    'aeab39a6a1b3a13b876444770e7e4c1a102d0a52835bc8476ed68e597ac0cbf7',
    'WORKER',
    0, 0, 0,
    datetime('now'), datetime('now')
),
-- 박관리 (SITE_ADMIN) - 현장 관리자
(
    'test_user_site_admin',
    '33333333333',
    'd6a27a0e18bb354dfc125daef48284e68232df45eaf1e802a9d2b0d64c44d5d4',
    '박관리',
    '박*리',
    '19800101',
    'e90cebe5ee90860b3730f20110120f9884801a99e837556fdb051385a956d6f4',
    'SITE_ADMIN',
    1, 1, 0,
    datetime('now'), datetime('now')
),
-- 최본사 (SUPER_ADMIN) - 본사 관리자
(
    'test_user_super_admin',
    '44444444444',
    '0deae2e7bb17c86b3e2af609319870058a0869146eb2d8c3c3bd5bcc7ae6a8d9',
    '최본사',
    '최*사',
    '19750101',
    'ecf25b1dffd1b2a57778c9ec623941ff77081a42ac46f96ac8355fdd4b9f1803',
    'SUPER_ADMIN',
    1, 1, 1,
    datetime('now'), datetime('now')
);

-- ============================================
-- Test Site
-- ============================================

INSERT OR REPLACE INTO sites (
    id, name, join_code, active, join_enabled, requires_approval, created_at
) VALUES (
    'test_site_1',
    '테스트 현장',
    'TEST01',
    1,
    1,
    0,
    datetime('now')
);

-- ============================================
-- Site Memberships
-- ============================================

INSERT OR REPLACE INTO site_memberships (
    id, user_id, site_id, role, status, joined_at
) VALUES 
-- 김선민 - WORKER at test site
(
    'test_membership_1',
    'test_user_worker_1',
    'test_site_1',
    'WORKER',
    'ACTIVE',
    datetime('now')
),
-- 이철수 - WORKER at test site
(
    'test_membership_2',
    'test_user_worker_2',
    'test_site_1',
    'WORKER',
    'ACTIVE',
    datetime('now')
),
-- 박관리 - SITE_ADMIN at test site
(
    'test_membership_3',
    'test_user_site_admin',
    'test_site_1',
    'SITE_ADMIN',
    'ACTIVE',
    datetime('now')
);

-- ============================================
-- Verification Query
-- ============================================
-- Run after seeding to verify:
-- SELECT id, name, phone, role FROM users WHERE id LIKE 'test_%';
-- SELECT u.name, s.name as site_name, m.role, m.status 
-- FROM site_memberships m 
-- JOIN users u ON m.user_id = u.id 
-- JOIN sites s ON m.site_id = s.id;
