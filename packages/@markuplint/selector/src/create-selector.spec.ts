import specs from '@markuplint/html-spec';
import { createJSDOMElement } from '@markuplint/test-tools';

import { createSelector } from './create-selector';

function c(selector: string, html: string) {
	return createSelector(selector, specs).match(createJSDOMElement(html));
}

describe('Extended Selector', () => {
	it(':aria', () => {
		expect(c(':aria(has name)', '<button>foo</button>')).toBeTruthy();
		expect(c(':aria(has name|1.1)', '<button>foo</button>')).toBeTruthy();
		expect(c(':aria(has name|1.2)', '<button>foo</button>')).toBeTruthy();
		expect(c(':aria(role is button)', '<button>foo</button>')).toBeTruthy();
		expect(c(':aria(role is button|1.1)', '<button>foo</button>')).toBeTruthy();
		expect(c(':aria(role is button|1.2)', '<button>foo</button>')).toBeTruthy();
	});
});
