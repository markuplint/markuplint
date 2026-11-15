// An extended spec whose `svg` and MathML `mi` take an obsolete `flag` attribute. No SVG or MathML
// attribute of the bundled spec data is obsolete, so the rule has no other way to report on one.
export default {
	specs: [
		{ name: 'svg:svg', attributes: { flag: { type: 'Any', obsolete: true } } },
		{ name: 'mml:mi', attributes: { flag: { type: 'Any', obsolete: true } } },
	],
};
