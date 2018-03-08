import CustomRule from '../../rule/custom-rule';
export declare type Type = 'double' | 'single';
export declare type Quote = '"' | "'";
export declare type QuoteMap = {
    [P in Type]: Quote;
};
declare const _default: CustomRule<Type, null>;
export default _default;
