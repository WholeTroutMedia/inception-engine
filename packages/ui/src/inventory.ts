// packages/ui/src/inventory.ts
// Registry of all Phase 1 components for the Design Agent to reference during IRIS-GEN operations.

export type ComponentCategory = 'Action' | 'Typography' | 'Feedback' | 'Layout' | 'Forms' | 'Overlays';

export interface ComponentDefinition {
    id: string;
    name: string;
    description: string;
    category: ComponentCategory;
    status: 'implemented' | 'planned' | 'in-progress';
    schemaPath?: string;
}

export const componentInventory: Record<string, ComponentDefinition[]> = {
    Action: [
        {
            id: 'ui-button',
            name: 'Button',
            description: 'Standard interactive button with variant mappings.',
            category: 'Action',
            status: 'implemented',
            schemaPath: 'schemas/ui/Button.json',
        },
    ],
    Typography: [
        {
            id: 'ui-heading',
            name: 'Heading',
            description: 'Semantic h1-h6 mapped to typography scale tokens.',
            category: 'Typography',
            status: 'implemented',
            schemaPath: 'schemas/ui/Heading.json',
        },
        {
            id: 'ui-text',
            name: 'Text',
            description: 'Body typography component.',
            category: 'Typography',
            status: 'planned',
        },
        {
            id: 'ui-label',
            name: 'Label',
            description: 'Accessible form label.',
            category: 'Typography',
            status: 'planned',
        },
    ],
    Feedback: [
        {
            id: 'ui-spinner',
            name: 'Spinner',
            description: 'Indeterminate loading indicator.',
            category: 'Feedback',
            status: 'implemented',
            schemaPath: 'schemas/ui/Spinner.json',
        },
        {
            id: 'ui-skeleton',
            name: 'Skeleton',
            description: 'Placeholder loading state for blocks.',
            category: 'Feedback',
            status: 'planned',
        },
    ],
    Forms: [
        {
            id: 'ui-select',
            name: 'Select',
            description: 'Custom dropdown select primitive.',
            category: 'Forms',
            status: 'implemented',
        },
        {
            id: 'ui-input',
            name: 'Input',
            description: 'Standard text input field.',
            category: 'Forms',
            status: 'planned',
        },
    ],
    Layout: [
        {
            id: 'ui-separator',
            name: 'Separator',
            description: 'Visual divider line between content blocks.',
            category: 'Layout',
            status: 'implemented',
        },
    ],
    Overlays: [
        {
            id: 'ui-modal',
            name: 'Modal',
            description: 'Dialog overlay window.',
            category: 'Overlays',
            status: 'implemented',
        },
    ],
};

export const getImplementedComponents = () => {
    return Object.values(componentInventory)
        .flat()
        .filter((c) => c.status === 'implemented');
};
