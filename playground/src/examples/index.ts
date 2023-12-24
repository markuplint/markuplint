import { fileTypes, type PlaygroundValues } from '../modules/save-values';

const configFormats = ['.markuplintrc'] as const;
const exampleFiles = import.meta.glob(['./files/**/*', './files/**/.markuplintrc'], { as: 'raw', eager: true });

type Metadata = Readonly<{
	title: string;
	description?: string;
}>;

export type ExampleData = PlaygroundValues &
	Readonly<{
		metadata: Metadata;
	}>;

const exampleDir: {
	[category in string]: Readonly<{
		examples: { [example in string]: ExampleData };
		metadata: Metadata;
	}>;
} = {};
for (const [path, load] of Object.entries(exampleFiles)) {
	// eslint-disable-next-line unicorn/no-unreadable-array-destructuring
	const [, , category, dirOrMetadata, file] = path.split('/');
	exampleDir[category] = exampleDir[category] ?? { examples: {}, metadata: {} };
	if (dirOrMetadata === 'metadata.json') {
		const metadata = exampleDir[category]['metadata'];
		Object.assign(metadata, JSON.parse(load));
	} else {
		const dirName = dirOrMetadata;
		const dirObj = exampleDir[category]['examples'][dirName] ?? {};
		exampleDir[category]['examples'][dirName] = dirObj;
		if (configFormats.includes(file)) {
			Object.assign(dirObj, { config: load } as const satisfies Partial<ExampleData>);
		} else if (file === 'metadata.json') {
			Object.assign(dirObj, { metadata: JSON.parse(load) } as const satisfies Partial<ExampleData>);
		} else {
			const ext = file.toLowerCase().split('.').pop();
			const maybeFileType = `.${ext}`;
			Object.assign(dirObj, { code: load } as const satisfies Partial<ExampleData>);
			if (fileTypes.includes(maybeFileType)) {
				Object.assign(dirObj, { codeFileType: maybeFileType } as const satisfies Partial<ExampleData>);
			}
		}
	}
}

const examples = Object.freeze(exampleDir);
export { examples };
