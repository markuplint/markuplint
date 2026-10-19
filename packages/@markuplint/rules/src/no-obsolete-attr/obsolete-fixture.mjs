// An extended spec whose `svg` takes an obsolete `flag` attribute. No SVG attribute of the bundled
// spec data is obsolete, so the rule has no other way to report on one.
export default {
	specs: [{ name: 'svg:svg', attributes: { flag: { type: 'Any', obsolete: true } } }],
};
