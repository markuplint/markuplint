import { RuleConfigOptions, RuleConfigValue } from '@markuplint/ml-config';

import Text from './text';

export default class RawText<T extends RuleConfigValue, O extends RuleConfigOptions> extends Text<T, O> {}
