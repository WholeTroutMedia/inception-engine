// packages/ui/src/components/Badge/Badge.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge.js';

const meta: Meta<typeof Badge> = {
    component: Badge,
    title: 'Feedback/Badge',
    tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = { args: { children: 'Default', variant: 'default' } };
export const Primary: Story = { args: { children: 'Active', variant: 'primary' } };
export const Success: Story = { args: { children: '✓ Complete', variant: 'success' } };
export const Warning: Story = { args: { children: '⚠ Pending', variant: 'warning' } };
export const Danger: Story = { args: { children: '✕ Error', variant: 'danger' } };
export const Info: Story = { args: { children: 'i Info', variant: 'info' } };

export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-wrap gap-[var(--inc-spacing-inline-sm)]">
            <Badge variant="default">Default</Badge>
            <Badge variant="primary">Active</Badge>
            <Badge variant="success">Complete</Badge>
            <Badge variant="warning">Pending</Badge>
            <Badge variant="danger">Error</Badge>
            <Badge variant="info">Info</Badge>
        </div>
    ),
};
