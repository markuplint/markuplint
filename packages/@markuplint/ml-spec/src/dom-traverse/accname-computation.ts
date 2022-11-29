import { computeAccessibleName } from 'dom-accessibility-api';

export function getAccname(el: Element) {
	return computeAccessibleName(el);
}
