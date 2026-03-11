import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Checkbox } from './Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'Components/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = { args: { label: 'Accept terms and conditions' } };
export const Checked: Story = { args: { label: 'I agree to receive marketing emails', defaultChecked: true } };
export const Indeterminate: Story = { args: { label: 'Select all items', indeterminate: true } };
export const Disabled: Story = { args: { label: 'This option is unavailable', disabled: true } };
export const WithDescription: Story = { args: { label: 'Enable notifications', description: 'Get notified when your workflows complete or require attention.' } };
export const Interactive: Story = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return <Checkbox label={checked ? '✓ Subscribed!' : 'Subscribe to updates'} checked={checked} onCheckedChange={setChecked} />;
  },
};
