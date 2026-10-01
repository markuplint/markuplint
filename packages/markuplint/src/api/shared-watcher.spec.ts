import type { WatchEventName, WatchSubscription } from './shared-watcher.js';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { subscribe, toWatchKey, whenWatching } from './shared-watcher.js';

type Received = readonly [filePath: string, event: WatchEventName];

/**
 * Collects what a subscriber is told, in order. `next()` waits for the next
 * event not yet taken, so an event that arrives before `next()` is called is
 * not lost.
 */
const createRecorder = () => {
	const queue: Received[] = [];
	const waiters: ((received: Received) => void)[] = [];
	return {
		listener: (filePath: string, event: WatchEventName) => {
			const received: Received = [filePath, event];
			const waiter = waiters.shift();
			if (waiter) {
				waiter(received);
			} else {
				queue.push(received);
			}
		},
		next: () =>
			new Promise<Received>(resolve => {
				const received = queue.shift();
				if (received) {
					resolve(received);
				} else {
					waiters.push(resolve);
				}
			}),
	};
};

/**
 * What an editor that saves through a temporary file does: the target is
 * replaced by a rename, so it gets a new inode.
 */
const saveAtomically = async (filePath: string, content: string) => {
	const temporary = `${filePath}.${process.hrtime.bigint()}.new`;
	await fs.writeFile(temporary, content);
	await fs.rename(temporary, filePath);
};

// chokidar drops a `change` of a path that follows another one within 50ms, so
// a second save of the same file has to start after that window.
const afterChangeThrottle = () => new Promise<void>(resolve => setTimeout(resolve, 75));

describe('shared watcher', () => {
	let tmpDir: string;
	let subscriptions: WatchSubscription[];

	const open = (listener: (filePath: string, event: WatchEventName) => void) => {
		const subscription = subscribe(listener);
		subscriptions.push(subscription);
		return subscription;
	};

	beforeEach(async () => {
		// Real path: the watcher reports the path it was given, and a symlinked
		// or 8.3-shortened tmpdir would not compare equal to it.
		tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'shared-watcher-')));
		subscriptions = [];
	});

	afterEach(async () => {
		await Promise.all(subscriptions.map(subscription => subscription.close()));
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	test('tells a subscriber of a change as soon as update() has resolved, naming the path it was given', async () => {
		const file = path.join(tmpDir, 'a.txt');
		await fs.writeFile(file, '1');
		const recorder = createRecorder();
		await open(recorder.listener).update([file]);

		await fs.writeFile(file, '2');

		expect(await recorder.next()).toStrictEqual([file, 'change']);
	});

	// chokidar re-attaches to a renamed file by inode on macOS and Linux only, and
	// Windows refuses to rename over a file that is being watched.
	test.skipIf(process.platform === 'win32')(
		'keeps telling every subscriber of a shared file across repeated atomic saves',
		async () => {
			// chokidar shares one `fs.watch` handle per path between watchers of the
			// same process, and re-attaches each watcher on a rename; on the second
			// atomic save every one of them would go deaf. One watcher for the
			// process is what prevents it (see the module JSDoc).
			const file = path.join(tmpDir, 'shared.txt');
			await fs.writeFile(file, '0');
			const first = createRecorder();
			const second = createRecorder();
			await open(first.listener).update([file]);
			await open(second.listener).update([file]);

			for (const content of ['1', '2', '3']) {
				await saveAtomically(file, content);
				expect(await Promise.all([first.next(), second.next()])).toStrictEqual([
					[file, 'change'],
					[file, 'change'],
				]);
				await afterChangeThrottle();
			}
		},
	);

	test('stops telling a subscriber of a path it dropped from update(), and keeps the others', async () => {
		const dropped = path.join(tmpDir, 'dropped.txt');
		const kept = path.join(tmpDir, 'kept.txt');
		await fs.writeFile(dropped, '0');
		await fs.writeFile(kept, '0');
		const recorder = createRecorder();
		const subscription = open(recorder.listener);
		await subscription.update([dropped, kept]);
		await subscription.update([kept]);

		await fs.writeFile(dropped, '1');
		await fs.writeFile(kept, '1');

		expect(await recorder.next()).toStrictEqual([kept, 'change']);
	});

	test('keeps a path watched for the other subscribers when one of them closes', async () => {
		const file = path.join(tmpDir, 'counted.txt');
		await fs.writeFile(file, '0');
		const closing = createRecorder();
		const staying = createRecorder();
		const closer = open(closing.listener);
		await closer.update([file]);
		await open(staying.listener).update([file]);

		await closer.close();
		await fs.writeFile(file, '1');

		expect(await staying.next()).toStrictEqual([file, 'change']);
	});

	test('starts a new watcher for a subscriber that arrives after every other one has closed', async () => {
		const file = path.join(tmpDir, 'again.txt');
		await fs.writeFile(file, '0');
		const earlier = open(createRecorder().listener);
		await earlier.update([file]);
		await earlier.close();

		const recorder = createRecorder();
		await open(recorder.listener).update([file]);
		await fs.writeFile(file, '1');

		expect(await recorder.next()).toStrictEqual([file, 'change']);
	});

	test('tells of a removal, and then of the file coming back', async () => {
		const file = path.join(tmpDir, 'removed.txt');
		await fs.writeFile(file, '0');
		const recorder = createRecorder();
		await open(recorder.listener).update([file]);

		await fs.rm(file);
		expect(await recorder.next()).toStrictEqual([file, 'unlink']);

		await whenWatching(file);
		await fs.writeFile(file, '1');
		// It comes back as an `add` where chokidar watches the directory for it, and
		// as a `change` where it keeps the handle (Windows).
		const [comingBack, event] = await recorder.next();
		expect(comingBack).toBe(file);
		expect(['add', 'change']).toContain(event);
	});

	// Where chokidar lets go of a removed file (not Windows), the watcher has to
	// add it again by itself, and has to leave it watched as before.
	test.skipIf(process.platform === 'win32')('watches a file that came back as it did before', async () => {
		const file = path.join(tmpDir, 'came-back.txt');
		await fs.writeFile(file, '0');
		const recorder = createRecorder();
		await open(recorder.listener).update([file]);
		await fs.rm(file);
		expect(await recorder.next()).toStrictEqual([file, 'unlink']);
		await whenWatching(file);
		await fs.writeFile(file, '1');
		expect(await recorder.next()).toStrictEqual([file, 'add']);

		await afterChangeThrottle();
		await fs.writeFile(file, '2');

		expect(await recorder.next()).toStrictEqual([file, 'change']);
	});

	test('watches a file that does not exist yet and tells when it appears', async () => {
		const file = path.join(tmpDir, 'later.txt');
		const recorder = createRecorder();
		await open(recorder.listener).update([file]);

		await fs.writeFile(file, '1');

		expect(await recorder.next()).toStrictEqual([file, 'add']);
	});

	test('does nothing for a closed subscription', async () => {
		const file = path.join(tmpDir, 'closed.txt');
		await fs.writeFile(file, '0');
		const subscription = open(createRecorder().listener);
		await subscription.close();

		await expect(subscription.update([file])).resolves.toBeUndefined();
		await expect(subscription.close()).resolves.toBeUndefined();
	});
});

describe('toWatchKey', () => {
	test('resolves a path to an absolute one', () => {
		expect(toWatchKey('relative/file.txt')).toBe(
			process.platform === 'win32'
				? path.resolve('relative/file.txt').toLowerCase()
				: path.resolve('relative/file.txt'),
		);
	});

	test.skipIf(process.platform !== 'win32')('ignores the case of a Windows path, drive letter included', () => {
		expect(toWatchKey('C:\\Project\\Item.tsx')).toBe(toWatchKey('c:\\project\\item.tsx'));
	});

	test.skipIf(process.platform === 'win32')('keeps the case of a path elsewhere', () => {
		expect(toWatchKey('/project/Item.tsx')).not.toBe(toWatchKey('/project/item.tsx'));
	});
});
