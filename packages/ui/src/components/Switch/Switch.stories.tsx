import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Switch } from './Switch';

const meta: Meta<typeof Switch> = {
  title: 'Components/Switch',
  component: Switch,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = { args: { label: 'Enable notifications' } };
export const Checked: Story = { args: { label: 'Dark mode', defaultChecked: true } };
export const Disabled: Story = { args: { label: 'This feature is locked', disabled: true } };
export const WithDescription: Story = { args: { label: 'Auto-deploy on push', description: 'Automatically deploy when code is pushed to the main branch.' } };
export const Interactive: Story = {
  render: () => {
    const [on, setOn] = useState(false);
    return <Switch label={on ? 'Engine: ONLINE' : 'Engine: OFFLINE'} checked={on} onCheckedChange={setOn} />;
  },
};
