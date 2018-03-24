import CustomRule from '../../rule/custom-rule';
export interface AttrSpasingOptions {
    lineBreak: 'either' | 'always' | 'never';
    width: number | false;
}
declare const _default: CustomRule<boolean, AttrSpasingOptions>;
export default _default;
