/**
 * @module reporter
 *
 * Output reporters for markuplint lint results.
 * Provides standard (detailed), simple (compact), and GitHub Actions annotation formats.
 */

/** Detailed multi-line reporter showing source context around each violation. */
export * from './standard-reporter.js';

/** Compact single-line-per-violation reporter. */
export * from './simple-reporter.js';

/** GitHub Actions workflow command reporter using `::error` and `::warning` annotations. */
export * from './github-reporter.js';
