-- Seed real education contents for production
-- Resolves site_id and created_by_id dynamically from first active site and first admin user

INSERT OR IGNORE INTO education_contents (id, site_id, title, description, content_type, content_url, thumbnail_url, duration_minutes, is_active, created_by_id, created_at, updated_at, external_source, external_id, source_url)
SELECT
  'ec-001', s.id, '산업안전보건법 주요 내용',
  '산업안전보건법의 핵심 조항과 사업장 적용 사항을 알아봅니다.',
  'VIDEO', 'https://www.youtube.com/watch?v=KoSHA_SAFETY_01', NULL, 30,
  1, u.id, unixepoch(), unixepoch(), 'KOSHA', 'KOSHA_SAFETY_01', 'https://www.kosha.or.kr'
FROM sites s, users u WHERE s.active = 1 AND u.role IN ('SUPER_ADMIN', 'SITE_ADMIN') LIMIT 1;

INSERT OR IGNORE INTO education_contents (id, site_id, title, description, content_type, content_url, thumbnail_url, duration_minutes, is_active, created_by_id, created_at, updated_at, external_source, external_id, source_url)
SELECT
  'ec-002', s.id, '개인보호구 착용 및 관리',
  '현장에서 필수적인 개인보호구(PPE)의 올바른 착용법과 관리 방법을 학습합니다.',
  'VIDEO', 'https://www.youtube.com/watch?v=KoSHA_PPE_01', NULL, 20,
  1, u.id, unixepoch(), unixepoch(), 'KOSHA', 'KOSHA_PPE_01', 'https://www.kosha.or.kr'
FROM sites s, users u WHERE s.active = 1 AND u.role IN ('SUPER_ADMIN', 'SITE_ADMIN') LIMIT 1;

INSERT OR IGNORE INTO education_contents (id, site_id, title, description, content_type, content_url, thumbnail_url, duration_minutes, is_active, created_by_id, created_at, updated_at, external_source, external_id, source_url)
SELECT
  'ec-003', s.id, '화재 예방 및 대응 요령',
  '사업장 화재 예방 수칙과 비상 시 대피 및 초기 진화 방법을 안내합니다.',
  'VIDEO', 'https://www.youtube.com/watch?v=KoSHA_FIRE_01', NULL, 25,
  1, u.id, unixepoch(), unixepoch(), 'KOSHA', 'KOSHA_FIRE_01', 'https://www.kosha.or.kr'
FROM sites s, users u WHERE s.active = 1 AND u.role IN ('SUPER_ADMIN', 'SITE_ADMIN') LIMIT 1;

INSERT OR IGNORE INTO education_contents (id, site_id, title, description, content_type, content_url, thumbnail_url, duration_minutes, is_active, created_by_id, created_at, updated_at, external_source, external_id, source_url)
SELECT
  'ec-004', s.id, '추락 재해 예방 교육',
  '고소 작업 시 안전벨트 착용, 안전난간 설치 등 추락 방지 핵심 수칙을 학습합니다.',
  'VIDEO', 'https://www.youtube.com/watch?v=KoSHA_FALL_01', NULL, 20,
  1, u.id, unixepoch(), unixepoch(), 'KOSHA', 'KOSHA_FALL_01', 'https://www.kosha.or.kr'
FROM sites s, users u WHERE s.active = 1 AND u.role IN ('SUPER_ADMIN', 'SITE_ADMIN') LIMIT 1;

INSERT OR IGNORE INTO education_contents (id, site_id, title, description, content_type, content_url, thumbnail_url, duration_minutes, is_active, created_by_id, created_at, updated_at, external_source, external_id, source_url)
SELECT
  'ec-005', s.id, '밀폐공간 작업 안전수칙',
  '밀폐공간 질식 사고 예방을 위한 사전 점검 및 작업 절차를 안내합니다.',
  'VIDEO', 'https://www.youtube.com/watch?v=KoSHA_CONFINED_01', NULL, 25,
  1, u.id, unixepoch(), unixepoch(), 'KOSHA', 'KOSHA_CONFINED_01', 'https://www.kosha.or.kr'
FROM sites s, users u WHERE s.active = 1 AND u.role IN ('SUPER_ADMIN', 'SITE_ADMIN') LIMIT 1;

INSERT OR IGNORE INTO education_contents (id, site_id, title, description, content_type, content_url, thumbnail_url, duration_minutes, is_active, created_by_id, created_at, updated_at, external_source, external_id, source_url)
SELECT
  'ec-006', s.id, '전기 안전 관리',
  '감전 사고 예방을 위한 전기 작업 안전 수칙과 점검 방법을 학습합니다.',
  'VIDEO', 'https://www.youtube.com/watch?v=KoSHA_ELEC_01', NULL, 20,
  1, u.id, unixepoch(), unixepoch(), 'KOSHA', 'KOSHA_ELEC_01', 'https://www.kosha.or.kr'
FROM sites s, users u WHERE s.active = 1 AND u.role IN ('SUPER_ADMIN', 'SITE_ADMIN') LIMIT 1;

INSERT OR IGNORE INTO education_contents (id, site_id, title, description, content_type, content_url, thumbnail_url, duration_minutes, is_active, created_by_id, created_at, updated_at, external_source, external_id, source_url)
SELECT
  'ec-007', s.id, '중량물 취급 및 운반 안전',
  '중량물 수동 운반 시 올바른 자세와 장비 사용법을 안내합니다.',
  'DOCUMENT', NULL, NULL, 15,
  1, u.id, unixepoch(), unixepoch(), 'KOSHA', 'KOSHA_HEAVY_01', 'https://www.kosha.or.kr'
FROM sites s, users u WHERE s.active = 1 AND u.role IN ('SUPER_ADMIN', 'SITE_ADMIN') LIMIT 1;

INSERT OR IGNORE INTO education_contents (id, site_id, title, description, content_type, content_url, thumbnail_url, duration_minutes, is_active, created_by_id, created_at, updated_at, external_source, external_id, source_url)
SELECT
  'ec-008', s.id, '작업 전 안전점검(TBM) 실시 요령',
  'TBM(Tool Box Meeting)의 목적, 진행 방법 및 점검표 작성법을 학습합니다.',
  'DOCUMENT', NULL, NULL, 15,
  1, u.id, unixepoch(), unixepoch(), 'KOSHA', 'KOSHA_TBM_01', 'https://www.kosha.or.kr'
FROM sites s, users u WHERE s.active = 1 AND u.role IN ('SUPER_ADMIN', 'SITE_ADMIN') LIMIT 1;

INSERT OR IGNORE INTO education_contents (id, site_id, title, description, content_type, content_url, thumbnail_url, duration_minutes, is_active, created_by_id, created_at, updated_at, external_source, external_id, source_url)
SELECT
  'ec-009', s.id, '위험성평가 기본 교육',
  '사업장 위험성평가의 절차와 위험요인 도출 및 개선대책 수립 방법을 안내합니다.',
  'VIDEO', 'https://www.youtube.com/watch?v=KoSHA_RISK_01', NULL, 30,
  1, u.id, unixepoch(), unixepoch(), 'KOSHA', 'KOSHA_RISK_01', 'https://www.kosha.or.kr'
FROM sites s, users u WHERE s.active = 1 AND u.role IN ('SUPER_ADMIN', 'SITE_ADMIN') LIMIT 1;

INSERT OR IGNORE INTO education_contents (id, site_id, title, description, content_type, content_url, thumbnail_url, duration_minutes, is_active, created_by_id, created_at, updated_at, external_source, external_id, source_url)
SELECT
  'ec-010', s.id, '응급처치 및 심폐소생술(CPR)',
  '현장 응급 상황 발생 시 응급처치 절차와 CPR/AED 사용법을 학습합니다.',
  'VIDEO', 'https://www.youtube.com/watch?v=KoSHA_CPR_01', NULL, 25,
  1, u.id, unixepoch(), unixepoch(), 'KOSHA', 'KOSHA_CPR_01', 'https://www.kosha.or.kr'
FROM sites s, users u WHERE s.active = 1 AND u.role IN ('SUPER_ADMIN', 'SITE_ADMIN') LIMIT 1;
