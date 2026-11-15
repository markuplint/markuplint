/**
 * Which of the Rust workflows a change has to run: the decision of the `changes` job of
 * `.github/workflows/test.yml`.
 *
 * A job that this decision skips reports success, and `ci-ok` passes on it, so a path missing here
 * is a Rust gate that silently does not run. The paths are therefore the `paths:` of the `push`
 * trigger of each workflow, and `ci-ok.spec.ts` fails when they differ.
 */

/**
 * The paths that start each workflow. An entry that ends with `/` is a directory (the `crates/**`
 * of a `paths:` filter), any other is a file. `rust.yml` also starts on `@markuplint/core`, the
 * napi side of the addon that its `napi-smoke` builds and loads on the three OSes: `v6` has no
 * nightly run, so a break that only macOS or Windows sees would show after the merge. A licence
 * check (`cargo-deny.yml`) has nothing to say about it.
 */
export const RUST_GATES = {
	rust: ['crates/', 'packages/@markuplint/core/', '.github/workflows/rust.yml'],
	cargo_deny: ['crates/', 'deny.toml', '.github/workflows/cargo-deny.yml'],
} as const;

export type RustGate = keyof typeof RUST_GATES;

/**
 * @param files - The paths a change touches, relative to the repository root. A moved file is
 *   listed under both of its paths (`git diff --no-renames`), so one moved out of `crates/` counts.
 * @returns For each workflow, whether a path of the change starts it
 */
export function touchedGates(files: readonly string[]): Record<RustGate, boolean> {
	const touches = (gate: RustGate) =>
		files.some(file =>
			RUST_GATES[gate].some(entry => (entry.endsWith('/') ? file.startsWith(entry) : file === entry)),
		);
	return { rust: touches('rust'), cargo_deny: touches('cargo_deny') };
}
