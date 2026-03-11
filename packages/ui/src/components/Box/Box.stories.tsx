import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Box } from './Box';

const meta: Meta<typeof Box> = {
  title: 'Layout/Box',
  component: Box,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof Box>;

export const Default: Story = {
  render: () => (
    <Box padding="md" style={{ background: 'var(--inc-color-background-subtle)', borderRadius: 8, border: '1px solid var(--inc-color-border-default)' }}>
      Box with md padding — the structural building block for all composition
    </Box>
  ),
};
export const AsSurface: Story = {
  render: () => (
    <Box as="section" padding="lg" style={{ background: 'var(--inc-color-background-default)', border: '1px solid var(--inc-color-border-default)', borderRadius: 12, maxWidth: 480 }}>
      <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Agent Roster</h3>
      <p style={{ color: '#71717a' }}>40 agents across 8 hives, coordinated by AVERI.</p>
    </Box>
  ),
};
