// @ts-ignore
import { computeAccessibleName } from 'dom-accessibility-api';

export function getAccname(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
): string {
	const name = computeAccessibleName(el);
	if (!name.trim() && el.nodeName === 'INPUT') {
		return el.getAttribute('placeholder')?.trim() ?? '';
	}
	return name;
}
