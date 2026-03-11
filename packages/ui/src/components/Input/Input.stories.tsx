import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: { type: { control: 'select', options: ['text', 'email', 'password', 'number', 'search', 'url'] } },
};
export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = { args: { placeholder: 'Enter text...', label: 'Label' } };
export const WithValue: Story = { args: { label: 'Email address', value: 'justin@wholetrouttmedia.com', readOnly: true } };
export const WithError: Story = { args: { label: 'Email address', value: 'not-an-email', error: 'Please enter a valid email address.' } };
export const Password: Story = { args: { type: 'password', label: 'Password', placeholder: '••••••••' } };
export const Search: Story = { args: { type: 'search', placeholder: 'Search workflows...', leadingIcon: '🔍' } };
export const Disabled: Story = { args: { label: 'API Endpoint', value: 'https://api.inceptionengine.ai', disabled: true } };
export const WithHelperText: Story = { args: { label: 'API Key', placeholder: 'sk-...', helperText: 'Your secret key. Never share this with anyone.' } };
export const Interactive: Story = {
  render: () => {
    const [val, setVal] = useState('');
    return <Input label="Live input" value={val} onChange={e => setVal(e.target.value)} placeholder="Type something..." helperText={`${val.length} characters`} />;
  },
};
