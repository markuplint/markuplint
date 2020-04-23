import readJson from './read-json';

export default function () {
	const json = readJson('../src/content-models.json', {
		models: {
			'#metadata': [] as string[],
			'#flow': [] as string[],
			'#sectioning': [] as string[],
			'#heading': [] as string[],
			'#phrasing': [] as string[],
			'#embedded': [] as string[],
			'#palpable': [] as string[],
			'#transparent': [] as string[],
			'#script-supporting': [] as string[],
		},
	});
	return json.models;
}
