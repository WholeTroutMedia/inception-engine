// ESLint rule: no-literal-css-values
// DS-204: Enforces use of CSS custom property tokens in JSX style objects
// Usage: add "inception/no-literal-css-values": "error" to .eslintrc

'use strict';

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow literal CSS values in JSX — use Inception design tokens instead',
            category: 'Design System',
            recommended: true,
            url: 'https://github.com/wholeTrout/brainchild-v5/tree/main/packages/design-agent#eslint-rule',
        },
        fixable: null,
        schema: [
            {
                type: 'object',
                properties: {
                    allowedPatterns: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Regex patterns for values that are allowed (e.g. "100%", "auto")',
                    },
                    severity: {
                        type: 'string',
                        enum: ['error', 'warn'],
                        default: 'error',
                    },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            noLiteralColor: 'Literal color "{{ value }}" detected. Use a CSS token: var(--inc-color-*)',
            noLiteralSpacing: 'Literal spacing "{{ value }}" detected. Use a CSS token: var(--inc-spacing-*)',
            noLiteralFont: 'Literal font size "{{ value }}" detected. Use a CSS token: var(--inc-font-size-*)',
            noArbitraryTw: 'Arbitrary Tailwind value "{{ value }}" detected. Use a semantic token class instead.',
        },
    },

    create(context) {
        const options = context.options[0] || {};
        const allowedPatterns = (options.allowedPatterns || [
            '^(0|auto|inherit|unset|revert|none|transparent|currentColor|100%|50%|33%|fit-content)$',
        ]).map((p) => new RegExp(p));

        function isAllowed(value) {
            return allowedPatterns.some((re) => re.test(String(value).trim()));
        }

        function isLiteralColor(value) {
            const s = String(value).trim();
            return /^#([0-9a-fA-F]{3,8})$/.test(s) ||
                /^rgba?\s*\(/.test(s) ||
                /^hsl[a]?\s*\(/.test(s);
        }

        function isLiteralSpacing(value, propName) {
            const spacingProps = ['padding', 'margin', 'gap', 'top', 'right', 'bottom', 'left'];
            if (!spacingProps.some((p) => propName.toLowerCase().includes(p))) return false;
            return /^\d+(px|rem|em)$/.test(String(value).trim());
        }

        function isLiteralFontSize(value, propName) {
            return propName.toLowerCase().includes('fontsize') && /^\d+(px|rem|pt)$/.test(String(value).trim());
        }

        function checkJSXStyleProp(node) {
            // Handle: style={{ color: '#ff0000' }}
            if (
                node.type === 'JSXAttribute' &&
                node.name?.name === 'style' &&
                node.value?.type === 'JSXExpressionContainer' &&
                node.value.expression?.type === 'ObjectExpression'
            ) {
                for (const prop of node.value.expression.properties) {
                    if (prop.type !== 'Property') continue;
                    const propName = prop.key?.name || prop.key?.value || '';
                    const value = prop.value?.value;
                    if (value === undefined || value === null) continue;
                    if (isAllowed(value)) continue;

                    if (isLiteralColor(value)) {
                        context.report({ node: prop, messageId: 'noLiteralColor', data: { value } });
                    } else if (isLiteralFontSize(value, propName)) {
                        context.report({ node: prop, messageId: 'noLiteralFont', data: { value } });
                    } else if (isLiteralSpacing(value, propName)) {
                        context.report({ node: prop, messageId: 'noLiteralSpacing', data: { value } });
                    }
                }
            }
        }

        function checkClassName(node) {
            // Handle: className="... text-[#ff0000] ..."
            if (
                node.type === 'JSXAttribute' &&
                node.name?.name === 'className' &&
                node.value?.type === 'Literal' &&
                typeof node.value.value === 'string'
            ) {
                const arbitrary = node.value.value.match(/\[[^\]]*#[0-9a-fA-F]{3,8}[^\]]*\]/g);
                if (arbitrary) {
                    context.report({
                        node: node.value,
                        messageId: 'noArbitraryTw',
                        data: { value: arbitrary.join(', ') },
                    });
                }
            }
        }

        return {
            JSXAttribute: (node) => {
                checkJSXStyleProp(node);
                checkClassName(node);
            },
        };
    },
};
