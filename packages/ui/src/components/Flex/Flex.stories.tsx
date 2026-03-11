import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Flex } from './Flex';

const meta: Meta<typeof Flex> = {
  title: 'Layout/Flex',
  component: Flex,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof Flex>;

const Chip = ({ label }: { label: string }) => (
  <div style={{ background: 'var(--inc-color-background-subtle, #fafafa)', border: '1px solid var(--inc-color-border-default, #e4e4e7)', borderRadius: 999, padding: '4px 12px', fontSize: 13 }}>{label}</div>
);

export const Row: Story = {
  render: () => (
    <Flex direction="row" align="center" justify="space-between" style={{ padding: 16, border: '1px solid #e4e4e7', borderRadius: 8 }}>
      <span style={{ fontWeight: 700 }}>ATELIER Design System</span>
      <Flex direction="row" gap="xs">
        <Chip label="v1.0.0" /><Chip label="8 layers" /><Chip label="42 patterns" />
      </Flex>
    </Flex>
  ),
};
export const Wrap: Story = {
  render: () => (
    <Flex wrap="wrap" gap="sm" style={{ maxWidth: 400 }}>
      {['FORGE', 'ATLAS', 'GENESIS', 'PHANTOM', 'CHRONOS', 'VERA', 'ATHENA', 'IRIS', 'COMPASS', 'HERALD'].map(name => (
        <Chip key={name} label={name} />
      ))}
    </Flex>
  ),
};
