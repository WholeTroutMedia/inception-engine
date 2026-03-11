import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Separator } from './Separator';

const meta: Meta<typeof Separator> = {
  title: 'Components/Separator',
  component: Separator,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof Separator>;

export const Horizontal: Story = {
  render: () => (
    <div style={{ width: 400 }}>
      <p style={{ marginBottom: 16 }}>Content above separator</p>
      <Separator />
      <p style={{ marginTop: 16 }}>Content below separator</p>
    </div>
  ),
};
export const Vertical: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: 32 }}>
      <span>Overview</span>
      <Separator orientation="vertical" />
      <span>Analytics</span>
      <Separator orientation="vertical" />
      <span>Settings</span>
    </div>
  ),
};
export const WithLabel: Story = {
  render: () => (
    <div style={{ width: 400 }}>
      <Separator label="OR" />
    </div>
  ),
};
