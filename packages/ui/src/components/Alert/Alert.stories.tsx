import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Alert } from './Alert';

const meta: Meta<typeof Alert> = {
  title: 'Components/Alert',
  component: Alert,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: { variant: { control: 'select', options: ['info', 'success', 'warning', 'danger'] } },
};
export default meta;
type Story = StoryObj<typeof Alert>;

export const Info: Story = { args: { variant: 'info', title: 'Information', children: 'Your changes have been saved and will take effect shortly.' } };
export const Success: Story = { args: { variant: 'success', title: 'Payment processed', children: 'Your subscription is now active. Welcome to Creative Liberation Engine Pro.' } };
export const Warning: Story = { args: { variant: 'warning', title: 'Approaching limit', children: 'You are at 85% of your monthly API quota. Consider upgrading your plan.' } };
export const Danger: Story = { args: { variant: 'danger', title: 'Deployment failed', children: 'The build pipeline encountered an error. Check the logs for details.' } };
export const NoTitle: Story = { args: { variant: 'info', children: 'This is an inline informational notice without a title.' } };
