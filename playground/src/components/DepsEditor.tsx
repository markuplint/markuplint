import type { DistTag } from '../modules/dist-tag';

type Props = Readonly<{
	status: 'success' | 'loading' | 'error' | null;
	depsPackages: Readonly<ReadonlySet<string>>;
	installedPackages: Readonly<Record<string, string>>;
	distTag?: DistTag;
	onChange?: (value: DistTag) => void;
}>;

export const DepsEditor = ({ depsPackages, installedPackages, status, distTag = 'latest', onChange }: Props) => {
	return (
		<section className="p-4 grid gap-4 grid-cols-1">
			<p>
				<label className="flex flex-wrap items-center gap-2">
					Version:
					<select
						className="select-arrow border border-slate-300 rounded-md"
						value={distTag}
						onChange={e => {
							const value = e.target.value;
							if (value === 'latest' || value === 'next') {
								onChange?.(value);
							}
						}}
					>
						<option value="latest">latest</option>
						<option value="next">next</option>
					</select>
				</label>
			</p>

			<section>
				<p>Install</p>
				{depsPackages.size > 0 && (
					<div className="bg-slate-50 shadow rounded p-2 leading-tight">
						<code>{`npm install -D ${[...depsPackages].map(name => `${name}@${distTag}`).join(' ')}`}</code>
					</div>
				)}
			</section>

			<section>
				<h3 className="py-1 w-fit rounded-t">
					<code>package.json</code>
				</h3>
				<div className="mt-2">
					{status === null ? (
						<p>Waiting...</p>
					) : (
						{
							loading: <p>Installing packages...</p>,
							error: <p>Installation error</p>,
							success: (
								<div className="py-2 px-2 overflow-x-auto bg-slate-50 shadow rounded">
									<pre className="leading-tight">
										<code>{JSON.stringify({ devDependencies: installedPackages }, null, 2)}</code>
									</pre>
								</div>
							),
						}[status]
					)}
				</div>
			</section>
		</section>
	);
};
