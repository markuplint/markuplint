import { Config } from '@jest/types';

const config: Config.InitialOptions = {
	verbose: true,
	collectCoverageFrom: [
		'packages/markuplint/src/**/*.ts',
		'packages/@markuplint/*/src/**/*.ts',
		'!**/*.spec.ts?(x)',
		'!**/*.test.ts?(x)',
	],
	projects: [
		{
			displayName: 'node',
			testPathIgnorePatterns: ['(\\.|/)browser\\.(spec|test)\\.tsx?$'],
			testEnvironment: 'node',
			transform: {
				'^.+\\.tsx?$': 'ts-jest',
			},
		},
		{
			displayName: 'browser',
			testRegex: '(\\.|/)browser\\.(spec|test)\\.tsx?$',
			resolver: '<rootDir>/test/browser-resolver.js',
			setupFiles: ['<rootDir>/test/browser-setup.js'],
			transform: {
				'^.+\\.tsx?$': 'ts-jest',
			},
		},
	],
};

export default config;
