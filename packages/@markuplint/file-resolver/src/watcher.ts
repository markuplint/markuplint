import type { WatchOptions } from 'chokidar';

import path from 'node:path';

import { FSWatcher } from 'chokidar';

type Options = {
	cwd?: string;
};

type ChangeListener = (this: Watcher, filePath: string, type: 'change' | 'add' | 'unlink') => void;

const watcherOptions: WatchOptions = {
	persistent: true,
	ignored: ['**/.git/**/*', '**/node_modules/**/*'],
};

export class Watcher {
	static async create(pattern: string, options?: Options) {
		const watcher = new Watcher(options);
		await watcher.update(pattern);
		return watcher;
	}

	#changeListener: ChangeListener | null = null;
	#cwd: string;
	#filesObserver = new FSWatcher(watcherOptions);

	private constructor(options?: Options) {
		this.#cwd = options?.cwd ?? process.cwd();
	}

	get files() {
		return Object.entries(this.#filesObserver.getWatched())
			.map(([dir, files]) => files.map(file => path.join(dir, file)))
			.flat()
			.sort();
	}

	addChangeListener(changeListener: ChangeListener) {
		this.#changeListener = changeListener;
	}

	async close() {
		await this.#filesObserver.close();
	}

	private onEvent(eventName: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir', filePath: string) {
		switch (eventName) {
			case 'change':
			case 'add':
			case 'unlink':
				this.#changeListener?.call(this, filePath, eventName);
				break;
			default:
				break;
		}
	}

	private async update(pattern: string) {
		const absPattern = path.isAbsolute(pattern) ? pattern : path.resolve(this.#cwd, pattern);

		await this.#filesObserver.close();

		this.#filesObserver.add(absPattern);

		return new Promise<void>(resolve => {
			const onReady = () => {
				this.#filesObserver.on('all', this.onEvent.bind(this));
				this.#filesObserver.off('ready', onReady);
				resolve();
			};
			this.#filesObserver.on('ready', onReady);
		});
	}
}
