import path from 'path';

export function optimizePath(base: string, target: string) {
	if (path.isAbsolute(target)) {
		return target;
	}

	const baseDir = path.dirname(base);
	return path.resolve(baseDir, target);
}
