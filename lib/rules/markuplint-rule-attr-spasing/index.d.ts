import CustomRule from '../../rule/custom-rule';
export interface Options {
    lineBreak: 'either' | 'always' | 'never';
    width: number | false;
}
declare const _default: CustomRule<boolean, Options>;
export default _default;
