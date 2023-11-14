type Props = Readonly<{
	status: 'success' | 'loading' | 'error';
	installedPackages: Readonly<Record<string, string>>;
	enableNextVersion?: boolean;
	onChange?: (value: boolean) => void;
}>;

export const DepsEditor = ({ installedPackages, status, enableNextVersion = false, onChange }: Props) => {
	return (
		<div>
			<p className="py-2 px-4">
				<code>package.json</code>
			</p>
			<p>
				<label>
					Enable <code>next</code> version{' '}
					<input type="checkbox" checked={enableNextVersion} onChange={e => onChange?.(e.target.checked)} />
				</label>
			</p>
			<div className="py-2 px-4">
				{status === 'loading' ? (
					<p>Installing...</p>
				) : status === 'error' ? (
					<p>Error loading packages</p>
				) : status === 'success' ? (
					<>
						<p>Installed:</p>
						{/* <ul>
							{Object.entries(installedPackages).map(([name, version]) => (
								<li key={name}>
									{name}@{version}
								</li>
							))}
						</ul> */}
						<pre>
							<code>{JSON.stringify({ devDependencies: installedPackages }, null, 2)}</code>
						</pre>
					</>
				) : null}
			</div>
			{Object.keys(installedPackages).length > 0 && (
				<code>{`npm install -D ${Object.keys(installedPackages)
					.map(name => `${name}@${enableNextVersion ? 'next' : 'latest'}`)
					.join(' ')}`}</code>
			)}
		</div>
	);
};
