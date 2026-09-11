import type { CustomSyntaxChecker } from '../../types.js';

import { checkMultiTypes } from '../../check-multi-types.js';

import { checkDateString } from './date-string.js';
import { checkDurationComponentListString, checkDurationISO8601LikeString } from './duration-string.js';
import { checkGlobalDateAndTimeString } from './global-date-and-time-string.js';
import { checkLocalDateAndTimeString, checkNormalizedLocalDateAndTimeString } from './local-date-and-time-string.js';
import { checkMonthString } from './month-string.js';
import { checkTimeString } from './time-string.js';
import { checkTimeZoneOffsetString } from './time-zone-offset-string.js';
import { checkWeekString } from './week-string.js';
import { checkYearString } from './year-string.js';
import { checkYearlessDateString } from './yearless-date-string.js';

const checks = [
	checkDateString(),
	checkTimeString(),
	checkMonthString(),
	checkYearlessDateString(),
	checkLocalDateAndTimeString(),
	checkNormalizedLocalDateAndTimeString(),
	checkTimeZoneOffsetString(),
	checkGlobalDateAndTimeString(),
	checkWeekString(),
	checkYearString(),
	checkDurationISO8601LikeString(),
	checkDurationComponentListString(),
];

/**
 * @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#dates-and-times
 */
export const checkDateTime: CustomSyntaxChecker = () => value => {
	return checkMultiTypes(value, checks);
};
