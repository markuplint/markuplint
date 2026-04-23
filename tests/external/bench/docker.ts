import { spawn } from 'node:child_process';

/** Container name used for the bench's nu-validator instance. */
export const CONTAINER_NAME = 'ml-nu-validator';
/** Default nu-validator image. Resolved to a digest at pull time. */
export const DEFAULT_IMAGE = 'ghcr.io/validator/validator:latest';
/**
 * Host port bound to the container. Chosen to not collide with the
 * canonical nu-validator default of 8888 so maintainers can keep their
 * own ad-hoc container running in parallel.
 */
export const DEFAULT_PORT = 28_888;

/** Caller-facing knobs for `start`. All fields have sensible defaults. */
export type DockerStartOptions = {
	readonly image?: string;
	readonly port?: number;
	readonly healthcheckTimeoutMs?: number;
};

/** Information about the running container, returned by `start`. */
export type DockerStartResult = {
	readonly image: string;
	readonly imageDigest: string;
	readonly port: number;
	readonly containerName: string;
};

type DockerRunResult = {
	readonly stdout: string;
	readonly stderr: string;
	readonly exitCode: number;
};

function runDocker(args: readonly string[]): Promise<DockerRunResult> {
	return new Promise((resolve, reject) => {
		const proc = spawn('docker', args as string[], { stdio: ['ignore', 'pipe', 'pipe'] });
		let stdout = '';
		let stderr = '';
		proc.stdout.on('data', (chunk: Buffer) => {
			stdout += chunk.toString('utf8');
		});
		proc.stderr.on('data', (chunk: Buffer) => {
			stderr += chunk.toString('utf8');
		});
		proc.on('error', reject);
		proc.on('close', exitCode => resolve({ stdout, stderr, exitCode: exitCode ?? -1 }));
	});
}

/**
 * Fail fast with a human-readable message when the Docker daemon is
 * unreachable. Called at the top of `start`.
 *
 * @throws If `docker info` exits non-zero.
 */
export async function ensureDaemon(): Promise<void> {
	const { exitCode } = await runDocker(['info', '--format', '{{.ServerVersion}}']);
	if (exitCode !== 0) {
		throw new Error(
			'Docker daemon not reachable. Start Docker Desktop / Engine and retry. See tests/external/CLAUDE.md.',
		);
	}
}

/**
 * Remove a container with the given name if one is present. Missing
 * containers are treated as success (the most common case). Any other
 * non-zero exit is surfaced on stderr so maintainers are not left wondering
 * why a stale container could not be replaced.
 *
 * @param name Container name; defaults to `CONTAINER_NAME`.
 */
export async function removeExistingContainer(name: string = CONTAINER_NAME): Promise<void> {
	const result = await runDocker(['rm', '-f', name]);
	if (result.exitCode !== 0 && !/No such container/i.test(result.stderr)) {
		console.warn(`[docker] rm -f ${name} returned ${result.exitCode}: ${result.stderr.trim()}`);
	}
}

/**
 * Pull `image` and resolve it to an immutable digest reference so every
 * snapshot can record exactly which build produced it.
 *
 * @param image Image reference, e.g. `ghcr.io/validator/validator:latest`.
 * @returns The full `name@sha256:…` digest from `RepoDigests`.
 * @throws If `docker pull` or `docker inspect` fail, or if no digest is
 *   reported for the image.
 */
export async function pullImage(image: string): Promise<string> {
	const pull = await runDocker(['pull', image]);
	if (pull.exitCode !== 0) {
		throw new Error(`docker pull failed: ${pull.stderr.trim()}`);
	}
	const inspect = await runDocker(['inspect', '--format', '{{index .RepoDigests 0}}', image]);
	if (inspect.exitCode !== 0) {
		throw new Error(`docker inspect failed: ${inspect.stderr.trim()}`);
	}
	const digest = inspect.stdout.trim();
	if (!digest.includes('@sha256:')) {
		throw new Error(`unable to resolve image digest: ${digest}`);
	}
	return digest;
}

/**
 * Poll nu-validator's HTML entry page until it responds with a non-5xx
 * status, or throw once the deadline is reached. nu-validator's JVM startup
 * is typically 10–30 seconds; the default timeout of 60 seconds buys some
 * margin without hiding a genuinely broken container.
 *
 * @param port Host port the container is bound to.
 * @param timeoutMs Overall deadline in milliseconds.
 */
export async function healthcheck(port: number, timeoutMs = 60_000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	let lastError: unknown;
	while (Date.now() < deadline) {
		try {
			const response = await fetch(`http://localhost:${port}/`);
			if (response.status < 500) {
				return;
			}
		} catch (err) {
			lastError = err;
		}
		await new Promise(resolve => setTimeout(resolve, 500));
	}
	throw new Error(`nu-validator healthcheck timed out after ${timeoutMs}ms: ${String(lastError)}`);
}

/**
 * Start a fresh nu-validator container and wait until it is responding.
 * Pulls the image, tears down any stale container with our name, launches
 * a new one (`--rm -d`), then polls for readiness.
 *
 * Callers should pair this with `installCleanupHandler` so the container
 * is removed on SIGINT / SIGTERM as well as normal shutdown.
 *
 * @param options Optional image / port / healthcheck timeout overrides.
 * @returns Information about the launched container.
 */
export async function start(options: DockerStartOptions = {}): Promise<DockerStartResult> {
	await ensureDaemon();
	const image = options.image ?? DEFAULT_IMAGE;
	const port = options.port ?? DEFAULT_PORT;

	const imageDigest = await pullImage(image);
	await removeExistingContainer();

	const run = await runDocker([
		'run',
		'--rm',
		'-d',
		'--name',
		CONTAINER_NAME,
		'-p',
		`${port}:8888`,
		image,
	]);
	if (run.exitCode !== 0) {
		throw new Error(`docker run failed: ${run.stderr.trim()}`);
	}

	await healthcheck(port, options.healthcheckTimeoutMs);

	return { image, imageDigest, port, containerName: CONTAINER_NAME };
}

/**
 * Stop the benchmark container. Exit codes are ignored because both
 * "container missing" and "already stopped" are benign here.
 *
 * @param name Container name; defaults to `CONTAINER_NAME`.
 */
export async function stop(name: string = CONTAINER_NAME): Promise<void> {
	await runDocker(['stop', name]);
}

/**
 * Register SIGINT / SIGTERM handlers that best-effort stop the container.
 * Returns a disposer that removes the listeners when the caller wants
 * ownership back (for example, after `stop()` finished normally).
 *
 * @returns Disposer that unregisters both listeners.
 */
export function installCleanupHandler(): () => void {
	const handler = () => {
		stop().catch(() => {
			/* swallow */
		});
	};
	process.once('SIGINT', handler);
	process.once('SIGTERM', handler);
	return () => {
		process.removeListener('SIGINT', handler);
		process.removeListener('SIGTERM', handler);
	};
}
