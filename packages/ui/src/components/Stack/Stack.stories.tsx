import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Stack } from './Stack';

const meta: Meta<typeof Stack> = {
  title: 'Layout/Stack',
  component: Stack,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof Stack>;

const Box = ({ label }: { label: string }) => (
  <div style={{ background: 'var(--inc-color-brand-primary, #0f62fe)', color: '#fff', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600 }}>{label}</div>
);

export const Vertical: Story = {
  render: () => (
    <Stack direction="column" gap="md">
      <Box label="Item 1" /><Box label="Item 2" /><Box label="Item 3" />
    </Stack>
  ),
};
export const Horizontal: Story = {
  render: () => (
    <Stack direction="row" gap="md" align="center">
      <Box label="Item A" /><Box label="Item B" /><Box label="Item C" />
    </Stack>
  ),
};
export const Gaps: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map(gap => (
        <div key={gap}>
          <div style={{ fontSize: 11, color: '#71717a', marginBottom: 8, textTransform: 'uppercase' }}>gap: {gap}</div>
          <Stack direction="row" gap={gap}><Box label="A" /><Box label="B" /><Box label="C" /></Stack>
        </div>
      ))}
    </div>
  ),
};
