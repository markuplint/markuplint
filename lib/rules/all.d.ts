import CustomRule from '../rule/custom-rule';
import { IndentationOptions } from './markuplint-rule-indentation';
import { RequiredH1Options } from './markuplint-rule-required-h1';
declare const _default: (CustomRule<"always" | "never", null> | CustomRule<null, null> | CustomRule<"always" | "never" | "always-single-line" | "never-single-line", null> | CustomRule<"double" | "single", null> | CustomRule<"no-upper" | "no-lower", null> | CustomRule<"lower" | "upper", null> | CustomRule<boolean, null> | CustomRule<string | string[] | null, null> | CustomRule<number | "tab", IndentationOptions> | CustomRule<boolean, RequiredH1Options>)[];
export default _default;
