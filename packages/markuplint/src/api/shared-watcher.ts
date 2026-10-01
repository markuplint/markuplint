/**
 * @module shared-watcher
 *
 * One file watcher for the whole process, which every watching `MLEngine`
 * subscribes to for the files it depends on: its config files and, since #4065,
 * the files `pretenders.scan` / `pretenders.auto` read.
 *
 * Why not one `FSWatcher` per engine: chokidar keeps the `fs.watch` handle of a
 * path in a module-level map, so every watcher of a process that watches the
 * same file shares it — and when an editor saves through a rename (the usual
 * way), each watcher re-attaches to the new inode by closing its own closer and
 * opening a new one, which finds the old shared handle still held by the other
 * watchers and attaches to that. After the second such save nobody is told of
 * anything any more. The VS Code server runs one engine per open document, and
 * a component is shared by many documents, so that is the normal case here.
 * With a single watcher per process the handle has a single owner.
 *
 * What follows from how chokidar behaves, and shapes the code below:
 *
 * - A watcher that has been `close()`d is not revived: its listeners are gone,
 *   its `ready` is spent, and its ignore list stays. A subscriber arriving
 *   after all others have left gets a new watcher (a "generation"), and events
 *   of an old one are dropped.
 * - Only file paths are `unwatch()`ed. Unwatching a directory ignores
 *   everything under it until that directory is added again, and directories
 *   are watched on this module's behalf (for a file that does not exist yet).
 *   They are released with the generation.
 * - `add()` returns before the path is being watched, and nothing signals
 *   completion. `update()` waits for it, by watching `getWatched()`, so that a
 *   caller who has awaited it can rely on the next change being seen.
 * - After `unlink`, chokidar re-attaches by itself only while it watches a
 *   single path. Here it watches many, so the path is added again.
 * - A removal is reported as `unlink` only after chokidar's 100ms atomic-write
 *   window has passed without the file coming back; a save through a temporary
 *   file never shows as one.
 * - `unwatch()` adds the path to chokidar's ignore list until the next
 *   `add()` of it, and the list is only cleared with the generation.
 */

import path from 'node:path';

import { isFatalError } from '@markuplint/shared';
import { FSWatcher } from 'chokidar';

/**
 * The longest `update()` waits for chokidar to start watching. A path that is
 * not being watched by then (a failure chokidar reports as an `error`) is not
 * waited for any more; the update still resolves.
 */
const ARM_TIMEOUT_MS = 2000;

export type WatchEventName = 'add' | 'change' | 'unlink';

export type WatchListener = (filePath: string, event: WatchEventName) => void;

/**
 * A subscriber's view of the shared watcher.
 */
export type WatchSubscription = {
	/**
	 * Sets the files the subscriber is told about. Resolves once chokidar is
	 * watching all of them (or gives up waiting), so a change made after it
	 * resolves is seen. Does nothing once the subscription is closed.
	 *
	 * @param filePaths - Absolute paths; a file that does not exist yet is
	 *   watched for its creation. Relative paths resolve against the cwd.
	 */
	update(filePaths: Iterable<string>): Promise<void>;
	/**
	 * Leaves the watcher; the last one to leave closes it, and resolves once its
	 * handles are released.
	 */
	close(): Promise<void>;
};

type Subscriber = {
	readonly generation: Generation;
	readonly listener: WatchListener;
	readonly onError: ((error: unknown) => void) | undefined;
	keys: ReadonlySet<string>;
	closed: boolean;
};

type Entry = {
	/** As it was given to chokidar, which reports events under this very string. */
	readonly path: string;
	readonly subscribers: Set<Subscriber>;
	/** Whether chokidar has been seen to watch it (see {@link isWatched}). */
	watched: boolean;
	/**
	 * Whether an `update()` has waited {@link ARM_TIMEOUT_MS} for it in vain, so
	 * that no later one waits again: a path chokidar never lists (under another
	 * spelling, say) would otherwise delay every update of every subscriber by that long.
	 */
	gaveUp: boolean;
};

type Generation = {
	readonly watcher: FSWatcher;
	readonly entries: Map<string, Entry>;
	readonly subscribers: Set<Subscriber>;
};

let current: Generation | null = null;

/**
 * The key two spellings of one file share: absolute, and without case on
 * Windows (VS Code reports `c:\…`, TypeScript's real path says `C:\…`).
 * Only for telling files apart — chokidar is given the path as it came.
 *
 * @param filePath - A path
 * @returns The path in its comparable form
 */
export function toWatchKey(filePath: string): string {
	const resolved = path.resolve(filePath);
	return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

/**
 * @param listener - Called with the path as given to {@link WatchSubscription.update}
 * @param onError - Called with the errors chokidar reports (a path it cannot
 *   watch, such as when the OS watch limit is reached); fatal ones are thrown
 * @returns The subscription, which watches nothing until `update()`
 */
export function subscribe(listener: WatchListener, onError?: (error: unknown) => void): WatchSubscription {
	current ??= createGeneration();
	const generation = current;
	const subscriber: Subscriber = { generation, listener, onError, keys: new Set(), closed: false };
	generation.subscribers.add(subscriber);

	return {
		update: filePaths => update(subscriber, filePaths),
		close: () => close(subscriber),
	};
}

/**
 * Resolves once the shared watcher is watching `filePath` again — after an
 * `unlink`, when it has been re-attached asynchronously.
 *
 * @param filePath - A path some subscriber gave to `update()`
 */
export async function whenWatching(filePath: string): Promise<void> {
	const generation = current;
	const entry = generation?.entries.get(toWatchKey(filePath));
	if (generation && entry) {
		await untilWatched(generation, [entry]);
	}
}

function createGeneration(): Generation {
	const watcher = new FSWatcher({ ignoreInitial: true });
	const generation: Generation = { watcher, entries: new Map(), subscribers: new Set() };

	watcher.on('add', filePath => dispatch(generation, 'add', filePath));
	watcher.on('change', filePath => dispatch(generation, 'change', filePath));
	watcher.on('unlink', filePath => dispatch(generation, 'unlink', filePath));
	watcher.on('error', error => {
		if (isFatalError(error)) {
			throw error;
		}
		for (const subscriber of generation.subscribers) {
			subscriber.onError?.(error);
		}
	});

	return generation;
}

function dispatch(generation: Generation, event: WatchEventName, filePath: string): void {
	if (current !== generation) {
		return;
	}
	const entry = generation.entries.get(toWatchKey(filePath));
	if (!entry) {
		return;
	}

	if (event === 'unlink') {
		// chokidar let go of the path; add it again so that its coming back is seen.
		entry.watched = false;
		entry.gaveUp = false;
		generation.watcher.add(entry.path);
	}

	for (const subscriber of entry.subscribers) {
		subscriber.listener(entry.path, event);
	}
}

async function update(subscriber: Subscriber, filePaths: Iterable<string>): Promise<void> {
	if (subscriber.closed) {
		return;
	}

	const { generation } = subscriber;
	const next = new Map<string, string>();
	for (const filePath of filePaths) {
		next.set(toWatchKey(filePath), filePath);
	}

	for (const key of subscriber.keys) {
		if (!next.has(key)) {
			release(generation, subscriber, key);
		}
	}

	const joined: Entry[] = [];
	for (const [key, filePath] of next) {
		let entry = generation.entries.get(key);
		if (!entry) {
			entry = { path: filePath, subscribers: new Set(), watched: false, gaveUp: false };
			generation.entries.set(key, entry);
			generation.watcher.add(filePath);
		}
		entry.subscribers.add(subscriber);
		joined.push(entry);
	}
	subscriber.keys = new Set(next.keys());

	await untilWatched(generation, joined);
}

function release(generation: Generation, subscriber: Subscriber, key: string): void {
	const entry = generation.entries.get(key);
	if (!entry) {
		return;
	}
	entry.subscribers.delete(subscriber);
	if (entry.subscribers.size === 0) {
		generation.entries.delete(key);
		// A file path only: see the module JSDoc.
		generation.watcher.unwatch(entry.path);
	}
}

async function close(subscriber: Subscriber): Promise<void> {
	if (subscriber.closed) {
		return;
	}
	subscriber.closed = true;

	const { generation } = subscriber;
	for (const key of subscriber.keys) {
		release(generation, subscriber, key);
	}
	subscriber.keys = new Set();
	generation.subscribers.delete(subscriber);

	if (generation.subscribers.size === 0) {
		if (current === generation) {
			current = null;
		}
		await generation.watcher.close();
	}
}

async function untilWatched(generation: Generation, entries: readonly Entry[]): Promise<void> {
	let pending = entries.filter(entry => !entry.watched && !entry.gaveUp);
	const deadline = Date.now() + ARM_TIMEOUT_MS;

	while (pending.length > 0 && current === generation) {
		const watched = generation.watcher.getWatched();
		pending = pending.filter(entry => {
			entry.watched = isWatched(watched, entry.path);
			return !entry.watched;
		});
		if (pending.length === 0) {
			break;
		}
		if (Date.now() >= deadline) {
			for (const entry of pending) {
				entry.gaveUp = true;
			}
			break;
		}
		await new Promise<void>(resolve => setTimeout(resolve, 1));
	}
}

/**
 * Whether chokidar has set up watching for `filePath`: it lists the file under
 * its directory once it holds a handle on it; and for a file that does not
 * exist yet it watches the nearest existing ancestor directory (listing it
 * under *its* parent) for the file to appear.
 */
function isWatched(watched: Readonly<Record<string, readonly string[]>>, filePath: string): boolean {
	let target = filePath;
	while (true) {
		const directory = path.dirname(target);
		if (watched[directory]?.includes(path.basename(target))) {
			return true;
		}
		if (directory === target) {
			return false;
		}
		target = directory;
	}
}
