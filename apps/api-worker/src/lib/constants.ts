/**
 * Cross-match batch limits for FAS ↔ AceTime placeholder resolution.
 *
 * Cross-matching queries FAS MariaDB (via Hyperdrive) for each placeholder user,
 * so batch size directly impacts Workers CPU time.
 *
 * @see https://github.com/qws941/safework2/issues/44
 */

/** Max placeholder users to cross-match per CRON cycle (runs every 5 min) */
export const CROSS_MATCH_CRON_BATCH = 10;

/** Default batch size for admin-triggered cross-match */
export const CROSS_MATCH_DEFAULT_BATCH = 50;

/** Hard ceiling for admin cross-match endpoint query param */
export const CROSS_MATCH_MAX_BATCH = 200;
