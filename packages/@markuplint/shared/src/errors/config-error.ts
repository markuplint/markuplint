/**
 * Thrown, or collected into a config set's `errs`, when a configuration
 * cannot be loaded (Tier 2 — Per-File Recoverable): a config file that is
 * missing, empty or malformed, that throws when it is imported, or whose
 * `$import` fails; a preset that cannot be imported; or a directory that a
 * config search cannot examine.
 * `MLEngine` does not lint the affected file; it reports one error-severity
 * `config-error` violation for it, while other files continue to be processed.
 */
export class ConfigLoadError extends Error {
	filePath: string;
	name = 'ConfigLoadError';
	referrer: string;

	/**
	 * @param message - Description of the load failure
	 * @param filePath - What failed to load: the absolute path of a config file, a module
	 * specifier, or `markuplint:<name>` for a preset. When a config search cannot examine a
	 * directory, or fails in a way that names no file, the absolute path of that directory
	 * @param referrer - Path of the file that referenced this config
	 * @param options - `cause`: the error that made the config fail to load, such as the one a
	 * config file throws when it is imported
	 */
	constructor(message: string, filePath: string, referrer: string, options?: ErrorOptions) {
		super(message + ` in ${referrer}`, options);
		this.filePath = filePath;
		this.referrer = referrer;
	}
}
