import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Heading } from './Heading';

const meta: Meta<typeof Heading> = {
  title: 'Components/Heading',
  component: Heading,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: { level: { control: 'select', options: [1, 2, 3, 4, 5, 6] } },
};
export default meta;
type Story = StoryObj<typeof Heading>;

export const AllLevels: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Heading level={1}>H1 — Creative Liberation Engine</Heading>
      <Heading level={2}>H2 — AVERI Collective</Heading>
      <Heading level={3}>H3 — FORGE Hive</Heading>
      <Heading level={4}>H4 — Agent Configuration</Heading>
      <Heading level={5}>H5 — Workflow Step</Heading>
      <Heading level={6}>H6 — Metadata label</Heading>
    </div>
  ),
};
export const H1: Story = { args: { level: 1, children: 'Design System Complete' } };
export const Truncated: Story = { args: { level: 2, truncate: true, children: 'This is an extremely long heading that will be truncated when it overflows its container width' } };
