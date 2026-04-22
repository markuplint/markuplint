import { spawn } from 'node:child_process';

export const CONTAINER_NAME = 'ml-nu-validator';
export const DEFAULT_IMAGE = 'ghcr.io/validator/validator:latest';
export const DEFAULT_PORT = 28_888;

export type DockerStartOptions = {
	readonly image?: string;
	readonly port?: number;
	readonly healthcheckTimeoutMs?: number;
};

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

export async function ensureDaemon(): Promise<void> {
	const { exitCode } = await runDocker(['info', '--format', '{{.ServerVersion}}']);
	if (exitCode !== 0) {
		throw new Error(
			'Docker daemon not reachable. Start Docker Desktop / Engine and retry. See tests/external/CLAUDE.md.',
		);
	}
}

export async function removeExistingContainer(name: string = CONTAINER_NAME): Promise<void> {
	await runDocker(['rm', '-f', name]);
}

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

export async function stop(name: string = CONTAINER_NAME): Promise<void> {
	await runDocker(['stop', name]);
}

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
