"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("./node");
const css_selector_1 = require("./css-selector");
class Element extends node_1.default {
    constructor(nodeName, location, raw, prevNode, nextNode, parentNode, attributes, namespaceURI, endTag) {
        super(nodeName, location, raw, prevNode, nextNode, parentNode);
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
            if (attr.name.toLowerCase() === attrName.toLowerCase()) {
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
        return classAttr.value.split(/\s+/).map(c => c.trim()).filter(c => c);
    }
}
exports.default = Element;
