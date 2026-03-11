import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Avatar } from './Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'Components/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: { size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] } },
};
export default meta;
type Story = StoryObj<typeof Avatar>;

export const WithImage: Story = { args: { src: 'https://i.pravatar.cc/150?img=12', alt: 'Justin A', size: 'md' } };
export const WithFallback: Story = { args: { fallback: 'JA', size: 'md' } };
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map(s => (
        <Avatar key={s} fallback="IE" size={s} />
      ))}
    </div>
  ),
};
export const AvatarGroup: Story = {
  render: () => (
    <div style={{ display: 'flex' }}>
      {[12, 22, 33, 45].map((i, idx) => (
        <div key={i} style={{ marginLeft: idx === 0 ? 0 : -8, zIndex: 4 - idx }}>
          <Avatar src={`https://i.pravatar.cc/150?img=${i}`} alt={`User ${i}`} size="sm" />
        </div>
      ))}
    </div>
  ),
};
