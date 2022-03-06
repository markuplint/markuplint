import type MLDOMAbstractElement from '../tokens/abstract-element';

import { computeAccessibleName } from 'dom-accessibility-api';

import { log } from '../../debug';

const accnameLog = log.extend('accname');

export function getAccname(el: MLDOMAbstractElement<any, any>) {
	try {
		// @ts-ignore
		const name = computeAccessibleName(el);
		return name;
	} catch (err) {
		accnameLog('Error: %O', err);
		return '';
	}
}
