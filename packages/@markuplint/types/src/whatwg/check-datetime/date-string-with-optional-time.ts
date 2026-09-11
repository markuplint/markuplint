import type { CustomSyntaxChecker } from '../../types.js';

import { checkMultiTypes } from '../../check-multi-types.js';

import { checkDateString } from './date-string.js';
import { checkGlobalDateAndTimeString } from './global-date-and-time-string.js';

const checks = [checkDateString(), checkGlobalDateAndTimeString()];

/**
 * Used by attributes whose spec defines the value as "a valid date string with
 * optional time" (for example `<del>`/`<ins>` `datetime`). The accepted
 * production is strictly the union of those two formats — month-only, year-only,
 * week, yearless date, time-only, local datetime, and duration strings are all
 * rejected.
 *
 * @see https://html.spec.whatwg.org/multipage/edits.html#attr-mod-datetime
 */
export const checkDateStringWithOptionalTime: CustomSyntaxChecker = () => value => {
	return checkMultiTypes(value, checks);
};
