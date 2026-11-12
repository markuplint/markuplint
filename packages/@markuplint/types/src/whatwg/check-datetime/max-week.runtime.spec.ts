import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { expect, test } from 'vitest';

const srcDir = import.meta.dirname;
const libDir = path.resolve(srcDir, '..', '..', '..', 'lib', 'whatwg', 'check-datetime');

/**
 * Runs `getMaxWeekNum` and `checkWeekString` of this package's built `lib/` in a fresh process
 * of the runtime that runs the specs, with `TZ` set in its environment (`yarn build` first).
 * A runtime reads `TZ` at start-up; whether it also follows a change of `process.env.TZ`
 * while it runs differs between Node.js, Bun and Deno, so the zone is not stubbed in-process.
 */
function runInTimeZone(tz: string) {
	const tokens = pathToFileURL(path.resolve(libDir, 'datetime-tokens.js')).href;
	const week = pathToFileURL(path.resolve(libDir, 'week-string.js')).href;
	const code = `Promise.all([import(${JSON.stringify(tokens)}), import(${JSON.stringify(week)})]).then(([t, w]) => {
		const isWeek = w.checkWeekString();
		console.log(JSON.stringify({
			offset: new Date(0).getTimezoneOffset(),
			weeks: [2015, 2020, 2021, 2026, 2027].map(y => t.getMaxWeekNum(y)),
			w53: isWeek('2021-W53').reason,
		}));
	})`;
	const args = 'Deno' in globalThis ? ['eval', code] : ['-e', code];
	const { stdout, stderr, status } = spawnSync(process.execPath, args, {
		encoding: 'utf8',
		cwd: srcDir,
		env: { ...process.env, TZ: tz },
	});
	const result: unknown = JSON.parse(stdout.trim().split('\n').at(-1) || '{}');
	// The child process loads `lib/`, so a `lib/` built before the last change to the source fails here: run `yarn build`.
	return { result, log: `exit ${status}\n${stderr}\nIf lib/ is older than the source, run yarn build.` };
}

// The offset of 1970-01-01 shows that the child process runs in the zone
test.each([
	['UTC', 0],
	['Asia/Tokyo', -540],
	['America/Los_Angeles', 480],
])('max-week does not depend on the time zone: %s', (tz, offset) => {
	const { result, log } = runInTimeZone(tz);
	expect(result, log).toStrictEqual({
		offset,
		// 2015 and 2026 start on a Thursday, 2020 on a Wednesday in a leap year, 2021 and 2027 on a Friday
		weeks: [53, 53, 52, 53, 52],
		w53: { type: 'out-of-range', gte: 1, lte: 52 },
	});
});
