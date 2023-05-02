import { configFormats } from './config-formats';

const exampleFiles = import.meta.glob(['../examples/**/*', '../examples/**/.markuplintrc'], { as: 'raw', eager: true });

type Metadata = {
	title: string;
	description?: string;
};

export type ExampleData = {
	codeFilename: string;
	code: string;
	configFilename: string;
	config: string;
	deps: string;
	metadata: Readonly<Metadata>;
};

const exampleDir: {
	[category in string]: {
		examples: { [example in string]: ExampleData };
		metadata: Readonly<Metadata>;
	};
} = {};
Object.entries(exampleFiles).forEach(([path, load]) => {
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
		} else if (file === 'deps.json') {
			exampleDir[category]['examples'][dir].deps = load;
		} else if (file === 'metadata.json') {
			exampleDir[category]['examples'][dir].metadata = JSON.parse(load);
		} else {
			exampleDir[category]['examples'][dir].code = load;
			exampleDir[category]['examples'][dir].codeFilename = file;
		}
	}
});
export const examples = exampleDir;
