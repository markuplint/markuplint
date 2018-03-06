"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = __importDefault(require("./node"));
const css_selector_1 = __importDefault(require("./css-selector"));
class Element extends node_1.default {
    constructor(nodeName, raw, line, col, startOffset, prevNode, nextNode, parentNode, attributes, namespaceURI, endTag) {
        super(nodeName, raw, line, col, startOffset, prevNode, nextNode, parentNode);
        this.type = 'Element';
        this.childNodes = [];
        this.endTagNode = null;
        this.obsolete = false;
        this.attributes = attributes;
        this.namespaceURI = namespaceURI;
        this.endTagNode = endTag;
    }
    getAttribute(attrName) {
        for (const attr of this.attributes) {
            if (attr.name.raw.toLowerCase() === attrName.toLowerCase()) {
                return attr;
            }
        }
    }
    hasAttribute(attrName) {
        return !!this.getAttribute(attrName);
    }
    matches(selector) {
        return css_selector_1.default(selector).match(this);
    }
    get id() {
        return this.getAttribute('id');
    }
    get classList() {
        const classAttr = this.getAttribute('class');
        if (!classAttr || !classAttr.value) {
            return [''];
        }
        return classAttr.value.value.split(/\s+/).map(c => c.trim()).filter(c => c);
    }
}
exports.default = Element;
