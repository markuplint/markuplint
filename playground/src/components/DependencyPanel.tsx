import type { DistTag } from '../modules/dist-tag';

import { memo } from 'react';

type Props = Readonly<{
	status: 'success' | 'loading' | 'error' | null;
	depsPackages: Readonly<ReadonlySet<string>>;
	installedPackages: Readonly<Record<string, string>>;
	distTag?: DistTag;
	onChange?: (value: DistTag) => void;
}>;

const DependencyPanelRaw = ({ depsPackages, installedPackages, status, distTag = 'latest', onChange }: Props) => {
	return (
		<section className="grid grid-cols-1 gap-4 p-4">
			<p>
				<label className="flex flex-wrap items-center gap-2">
					Version:
					<select
						className="select-arrow rounded-md border border-slate-300"
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
					<div className="rounded bg-slate-50 p-2 leading-tight shadow">
						<code>{`npm install -D ${[...depsPackages].map(name => `${name}@${distTag}`).join(' ')}`}</code>
					</div>
				)}
			</section>

			<section>
				<h3 className="w-fit rounded-t py-1">
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
								<div className="overflow-x-auto rounded bg-slate-50 px-2 py-2 shadow">
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
export const DependencyPanel = memo(DependencyPanelRaw);
