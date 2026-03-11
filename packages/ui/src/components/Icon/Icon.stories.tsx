import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Icon } from './Icon';

// Icon is a minimal stub component: only accepts { name: string }
const meta: Meta<typeof Icon> = {
  title: 'Components/Icon',
  component: Icon,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: { name: { control: 'text' } },
};
export default meta;
type Story = StoryObj<typeof Icon>;

export const Default: Story = { args: { name: 'zap' } };

export const CommonIcons: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 16 }}>
      {['zap', 'settings', 'user', 'search', 'bell', 'check', 'x', 'plus', 'edit', 'trash', 'arrow-right', 'chevron-down', 'eye', 'lock', 'globe', 'star'].map(name => (
        <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <Icon name={name} />
          <span style={{ fontSize: 10, color: '#71717a' }}>{name}</span>
        </div>
      ))}
    </div>
  ),
};

export const InContext: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#f4f4f5', borderRadius: 6 }}>
      <Icon name="zap" />
      <span style={{ fontSize: 14 }}>Quick action</span>
    </div>
  ),
};
