import type { DistTag } from '../modules/dist-tag';

type Props = Readonly<{
	status: 'success' | 'loading' | 'error';
	depsPackages: Readonly<ReadonlySet<string>>;
	installedPackages: Readonly<Record<string, string>>;
	distTag?: DistTag;
	onChange?: (value: DistTag) => void;
}>;

export const DepsEditor = ({ depsPackages, installedPackages, status, distTag = 'latest', onChange }: Props) => {
	return (
		<section>
			<p>Command:</p>
			{depsPackages.size > 0 && (
				<div className="bg-slate-50 rounded p-2 leading-tight">
					<code>{`npm install -D ${[...depsPackages].map(name => `${name}@${distTag}`).join(' ')}`}</code>
				</div>
			)}
			<p>
				<label>
					<input
						type="checkbox"
						checked={distTag === 'next'}
						onChange={e => onChange?.(e.target.checked ? 'next' : 'latest')}
					/>{' '}
					Enable <code>next</code> version
				</label>
			</p>
			<p className="py-2 px-4">
				<code>package.json</code>
			</p>
			<div className="py-2 px-4">
				{status === 'loading' ? (
					<p>Installing...</p>
				) : status === 'error' ? (
					<p>Error loading packages</p>
				) : status === 'success' ? (
					<>
						<pre>
							<code>{JSON.stringify({ devDependencies: installedPackages }, null, 2)}</code>
						</pre>
					</>
				) : null}
			</div>
		</section>
	);
};
