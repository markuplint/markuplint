import { createTokenFromRawCode } from './create-token';

export function getSpaceBefore(offset: number, rawCode: string) {
	const aboveCode = rawCode.slice(0, offset);
	const aboveAttrMatched = aboveCode.match(/\s+$/m);
	const aboveAttrChar = aboveAttrMatched?.[0] ?? '';

	const spacesBefore = createTokenFromRawCode(aboveAttrChar, offset - aboveAttrChar.length, rawCode);

	return spacesBefore;
}
