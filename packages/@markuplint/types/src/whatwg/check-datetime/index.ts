import type { CustomSyntaxChecker } from '../../types';

import { checkMultiTypes } from '../../check-multi-types';

import { checkDateString } from './date-string';
import { checkDurationComponentListString, checkDurationISO8601LikeString } from './duration-string';
import { checkGlobalDateAndTimeString } from './global-date-and-time-string';
import { checkLocalDateAndTimeString, checkNormalizedLocalDateAndTimeString } from './local-date-and-time-string';
import { checkMonthString } from './month-string';
import { checkTimeString } from './time-string';
import { checkTimeZoneOffsetString } from './time-zone-offset-string';
import { checkWeekString } from './week-string';
import { checkYearString } from './year-string';
import { checkYearlessDateString } from './yearless-date-string';

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
