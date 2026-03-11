// packages/ui/src/components/Button/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button.js';

const meta: Meta<typeof Button> = {
    component: Button,
    title: 'Actions/Button',
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['primary', 'secondary', 'ghost', 'danger', 'link'],
        },
        size: {
            control: 'select',
            options: ['xs', 'sm', 'md', 'lg'],
        },
        loading: { control: 'boolean' },
        disabled: { control: 'boolean' },
    },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { children: 'Primary Button', variant: 'primary', size: 'md' } };
export const Secondary: Story = { args: { children: 'Secondary Button', variant: 'secondary', size: 'md' } };
export const Ghost: Story = { args: { children: 'Ghost Button', variant: 'ghost', size: 'md' } };
export const Danger: Story = { args: { children: 'Delete', variant: 'danger', size: 'md' } };
export const Link: Story = { args: { children: 'Learn more →', variant: 'link', size: 'md' } };
export const Loading: Story = { args: { children: 'Saving…', variant: 'primary', size: 'md', loading: true } };
export const Disabled: Story = { args: { children: 'Disabled', variant: 'primary', size: 'md', disabled: true } };

export const AllSizes: Story = {
    render: () => (
        <div className="flex items-center gap-[var(--inc-spacing-inline-sm)]">
            <Button size="xs">XS</Button>
            <Button size="sm">SM</Button>
            <Button size="md">MD</Button>
            <Button size="lg">LG</Button>
        </div>
    ),
};

export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-wrap gap-[var(--inc-spacing-inline-sm)]">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="link">Link</Button>
        </div>
    ),
};
