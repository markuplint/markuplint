import { configFormats } from '../modules/config-formats';

const exampleFiles = import.meta.glob(['./files/**/*', './files/**/.markuplintrc'], { as: 'raw', eager: true });

type Metadata = {
	title: string;
	description?: string;
	docLink?: string;
	docText?: string;
};

export type ExampleData = {
	codeFilename: string;
	code: string;
	configFilename: string;
	config: string;
	metadata: Readonly<Metadata>;
};

const exampleDir: {
	[category in string]: {
		examples: { [example in string]: ExampleData };
		metadata: Readonly<Metadata>;
	};
} = {};
for (const [path, load] of Object.entries(exampleFiles)) {
	// eslint-disable-next-line unicorn/no-unreadable-array-destructuring
	const [, , category, dirOrMetadata, file] = path.split('/');
	exampleDir[category] = exampleDir[category] ?? { examples: {}, metadata: {} };
	if (dirOrMetadata === 'metadata.json') {
		exampleDir[category].metadata = JSON.parse(load);
	} else {
		const dir = dirOrMetadata;
		exampleDir[category]['examples'][dir] = exampleDir[category]['examples'][dir] ?? {};
		if (configFormats.includes(file)) {
			exampleDir[category]['examples'][dir].config = load;
			exampleDir[category]['examples'][dir].configFilename = file;
		} else if (file === 'metadata.json') {
			exampleDir[category]['examples'][dir].metadata = JSON.parse(load);
		} else {
			exampleDir[category]['examples'][dir].code = load;
			exampleDir[category]['examples'][dir].codeFilename = file;
		}
	}
}
export const examples = exampleDir;
