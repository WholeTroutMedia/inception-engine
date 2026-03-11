import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Textarea } from './Textarea';

const meta: Meta<typeof Textarea> = {
  title: 'Components/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = { args: { label: 'Description', placeholder: 'Describe the workflow in detail...' } };
export const WithHint: Story = { args: { label: 'System Prompt', placeholder: 'You are AVERI...', hint: 'This context is prepended to every agent interaction.' } };
export const WithError: Story = { args: { label: 'Brief', placeholder: 'Enter project brief...', error: 'Brief must be at least 50 characters.' } };
export const Disabled: Story = { args: { label: 'Read-only context', value: 'This field is locked because the workflow is active.', disabled: true } };
export const Interactive: Story = {
  render: () => {
    const [val, setVal] = useState('');
    const limit = 280;
    return (
      <Textarea
        label="What are you building?"
        value={val}
        onChange={e => setVal(e.target.value.slice(0, limit))}
        placeholder="Describe your idea..."
        hint={`${val.length} / ${limit} characters`}
        error={val.length >= limit ? 'Character limit reached.' : undefined}
      />
    );
  },
};
