import type { FileSystemTree, WebContainerProcess } from '@webcontainer/api';

import { WebContainer } from '@webcontainer/api';

let webContainer: WebContainer;

type ConsoleMethods = {
	appendLine: (string: string) => void;
	append: (string: string) => void;
	clear: () => void;
};

export const setupContainerServer = async ({ appendLine, append, clear }: ConsoleMethods) => {
	clear();
	appendLine('Starting WebContainer...');
	webContainer = await WebContainer.boot();
	appendLine('WebContainer started');

	const linterFiles = import.meta.glob('./linter/*', { as: 'raw', eager: true });
	const linterDir: FileSystemTree = {};
	Object.entries(linterFiles).forEach(([path, load]) => {
		const file = path.split('/').pop() as string;
		linterDir[file] = {
			file: { contents: load },
		};
	});
	const serverFiles: FileSystemTree = {
		linter: { directory: linterDir },
		src: { directory: {} },
	};
	await webContainer.mount(serverFiles);

	const linterServer = new LinterServer();
	let installProcess: WebContainerProcess | undefined;
	let updatingDeps = Promise.resolve<Record<string, string>>({});
	let updatingConfig = Promise.resolve();
	let restartingServer = Promise.resolve();
	let configFilename = '.markuplintrc';

	const containerServer = {
		installationExit: Promise.resolve(-1),
		updateDeps: async (contents: string) => {
			updatingDeps = (async () => {
				await webContainer.fs.writeFile('package.json', `{ "devDependencies": ${contents} }`, 'utf-8');
				if (installProcess) {
					installProcess.kill();
				}
				clear();
				appendLine('Installing dependencies...');
				installProcess = await webContainer.spawn('npm', ['install']);
				void installProcess.output.pipeTo(
					new WritableStream({
						write(data) {
							append(data);
						},
					}),
				);
				containerServer.installationExit = installProcess.exit;
				if ((await containerServer.installationExit) !== 0) {
					appendLine('Installation failed');
					return {};
				} else {
					appendLine('Installation succeeded');
					const installedPackages: Record<string, string> = {};
					const deps = JSON.parse(contents);
					for (const dep of Object.keys(deps)) {
						const json = await webContainer.fs.readFile(`/node_modules/${dep}/package.json`, 'utf-8');
						const parsed = JSON.parse(json);
						installedPackages[parsed.name] = parsed.version;
					}
					return installedPackages;
				}
			})();
			const result = await updatingDeps;
			if ((await containerServer.installationExit) !== 0) {
				throw new Error('Installation failed');
			} else {
				appendLine('Restarting server...');
				restartingServer = linterServer.restart();
				await restartingServer;
			}
			return result;
		},
		updateConfig: async (filename: string, contents: string) => {
			updatingConfig = (async () => {
				if (filename !== configFilename) {
					await webContainer.fs.rm(filename);
					configFilename = filename;
				}
				await webContainer.fs.writeFile(filename, contents, 'utf-8');
			})();
			await updatingConfig;

			if ((await containerServer.installationExit) !== 0) {
				throw new Error('Installation failed');
			} else {
				appendLine('Restarting server...');
				restartingServer = linterServer.restart();
				await restartingServer;
			}
		},
		lint: async (filename: string, contents: string) => {
			const path = `src/${filename}`;
			await webContainer.fs.writeFile(path, contents, 'utf-8');

			await Promise.all([updatingDeps, updatingConfig, restartingServer]);
			if ((await containerServer.installationExit) !== 0) {
				throw new Error('Installation failed');
			}

			const result = await linterServer.request(path, () => true); // TODO: lint結果かどうかチェックする
			return result;
		},
		restart: async () => {
			await linterServer.restart();
		},
	};

	return containerServer;
};

class LinterServer {
	private serverInternal: Awaited<ReturnType<typeof this.start>> | undefined;

	constructor() {}

	public async request(input: string, test: (output: string) => boolean) {
		if (!this.serverInternal) {
			this.serverInternal = await this.start();
		}
		await this.serverInternal.ready();
		return await this.serverInternal.request(input, test);
	}

	public async restart() {
		if (this.serverInternal) {
			this.serverInternal.process.kill();
			await this.serverInternal.process.exit;
		}
		this.serverInternal = await this.start();
	}

	private async start() {
		const locale = navigator.language;
		const localeWithoutRegion = locale.split('-')[0];
		const process = await webContainer.spawn('node', ['./linter/index.mjs', '--locale', localeWithoutRegion]);
		const callbacks: ((output: string) => void)[] = [];
		const writer = process.input.getWriter();
		const request = (input: string, test: (output: string) => boolean) => {
			const promise = new Promise<string>(resolve => {
				const callback = (output: string) => {
					if (test(output)) {
						callbacks.splice(callbacks.indexOf(callback), 1);
						resolve(output);
					}
				};
				callbacks.push(callback);
			});
			void writer.write(input);
			return promise;
		};
		void process.output.pipeTo(
			new WritableStream({
				write(data) {
					callbacks.forEach(callback => callback(data));
				},
			}),
		);
		const ready = async () => {
			await request('ready?', output => output === 'ready');
		};

		return { process, request, ready };
	}
}
