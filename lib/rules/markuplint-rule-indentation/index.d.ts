import CustomRule from '../../rule/custom-rule';
export declare type Value = 'tab' | number;
export interface IndentationOptions {
    alignment: boolean;
    'indent-nested-nodes': boolean | 'always' | 'never';
}
declare const _default: CustomRule<Value, IndentationOptions>;
export default _default;
