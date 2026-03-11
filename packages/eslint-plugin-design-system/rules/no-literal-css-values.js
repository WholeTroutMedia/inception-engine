/**
 * @fileoverview Disallow literal CSS values (colors, spacing) in classNames and style objects
 * Enforces usage of CSS variables from the design system tokens.
 */

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow literal CSS values (colors, specific spacing) to ensure token adherence.',
            category: 'Design System',
            recommended: true,
        },
        fixable: null,
        schema: [], // no options
        messages: {
            literalValue: 'Literal CSS value found: "{{ value }}". Use the appropriate --inc-* design token instead.',
        },
    },
    create(context) {
        const literalCssPattern = /\[#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\]|\[(rgb|hsl)a?\(.*?\)\]|\[\d+(px|rem|em|vh|vw|%)\]/i;
        const literalStylePattern = /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})|(rgb|hsl)a?\(.*?\)|(\d+(px|rem|em|vh|vw|%)))$/i;

        function checkStringValue(node, value) {
            const match = literalCssPattern.exec(value);
            if (match) {
                context.report({
                    node,
                    messageId: 'literalValue',
                    data: {
                        value: match[0],
                    },
                });
            }
        }

        return {
            Literal(node) {
                if (typeof node.value === 'string' && node.parent && node.parent.type !== 'ImportDeclaration') {
                    checkStringValue(node, node.value);
                }
            },
            TemplateElement(node) {
                if (typeof node.value.raw === 'string') {
                    checkStringValue(node, node.value.raw);
                }
            },
            Property(node) {
                if (node.parent && node.parent.type === 'ObjectExpression') {
                    let isStyleProp = false;
                    let current = node.parent;
                    while (current) {
                        if (current.type === 'JSXAttribute' && current.name && current.name.name === 'style') {
                            isStyleProp = true;
                            break;
                        }
                        current = current.parent;
                    }

                    if (isStyleProp) {
                        const valNode = node.value;
                        if (valNode.type === 'Literal' && typeof valNode.value === 'string') {
                            const match = literalStylePattern.exec(valNode.value);
                            if (match) {
                                context.report({
                                    node: valNode,
                                    messageId: 'literalValue',
                                    data: { value: valNode.value },
                                });
                            }
                        }
                    }
                }
            }
        };
    },
};
