const specs = require('@markuplint/html-spec');
const { createJSDOMElement } = require('@markuplint/test-tools');

const { createSelector } = require('../lib/create-selector');

function c(selector, html) {
	return createSelector(selector, specs).match(createJSDOMElement(html));
}

describe('Extended Selector', () => {
	it(':aria', () => {
		expect(c(':aria(has name)', '<button>foo</button>')).toBeTruthy();
		expect(c(':aria(has name|1.1)', '<button>foo</button>')).toBeTruthy();
		expect(c(':aria(has name|1.2)', '<button>foo</button>')).toBeTruthy();
	});

	it(':role', () => {
		expect(c(':role(button)', '<button>foo</button>')).toBeTruthy();
		expect(c(':role(button|1.1)', '<button>foo</button>')).toBeTruthy();
		expect(c(':role(button|1.2)', '<button>foo</button>')).toBeTruthy();
		expect(c(':role(button|1.2)', '<div role="button">foo</div>')).toBeTruthy();
		expect(c(':role(button|1.2)', '<div>foo</div>')).toBeFalsy();
	});

	it(':model', () => {
		expect(c(':model(flow)', '<a></a>')).toBeTruthy();
		expect(c(':model(interactive)', '<a></a>')).toBeFalsy();
		expect(c(':model(interactive)', '<a href="path/to"></a>')).toBeTruthy();
		expect(c(':not(:model(interactive))', '<a href="path/to"></a>')).toBeFalsy();
	});

	it('The address element', () => {
		const contentModel =
			':model(flow):not(address, :model(heading), :model(sectioning), header, footer, :has(address, :model(heading), :model(sectioning), header, footer))';
		expect(c(contentModel, '<a></a>')).toBeTruthy();
		expect(c(contentModel, '<h1></h1>')).toBeFalsy();
		expect(c(contentModel, '<address></address>')).toBeFalsy();
		expect(c(contentModel, '<header></header>')).toBeFalsy();
		expect(c(contentModel, '<div><a></a></div>')).toBeTruthy();
		expect(c(contentModel, '<div><h1></h1></div>')).toBeFalsy();
		expect(c(contentModel, '<div><address></address></div>')).toBeFalsy();
		expect(c(contentModel, '<div><header></header></div>')).toBeFalsy();
	});
});
