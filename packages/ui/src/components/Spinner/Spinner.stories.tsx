import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Spinner } from './Spinner';

const meta: Meta<typeof Spinner> = {
  title: 'Components/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: { size: { control: 'select', options: ['xs', 'sm', 'md', 'lg'] } },
};
export default meta;
type Story = StoryObj<typeof Spinner>;

export const Default: Story = { args: { size: 'md' } };
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      {(['xs', 'sm', 'md', 'lg'] as const).map(size => (
        <div key={size} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <Spinner size={size} />
          <span style={{ fontSize: 11, color: '#71717a' }}>{size}</span>
        </div>
      ))}
    </div>
  ),
};
export const WithLabel: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Spinner size="sm" />
      <span style={{ fontSize: 14, color: '#71717a' }}>Deploying to Cloud Run...</span>
    </div>
  ),
};
export const InButton: Story = {
  render: () => (
    <button disabled style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#0f62fe', color: '#fff', border: 'none', borderRadius: 6, cursor: 'not-allowed', opacity: 0.8 }}>
      <Spinner size="xs" color="white" />
      Processing...
    </button>
  ),
};
