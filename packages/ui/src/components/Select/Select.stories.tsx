import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './Select';

const meta: Meta<typeof Select> = {
  title: 'Components/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger style={{ width: 240 }}><SelectValue placeholder="Select a model..." /></SelectTrigger>
      <SelectContent>
        <SelectItem value="gemini-2">Gemini 2.0 Flash</SelectItem>
        <SelectItem value="gemini-2-pro">Gemini 2.0 Pro</SelectItem>
        <SelectItem value="claude-3-5">Claude 3.5 Sonnet</SelectItem>
        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const WithDefaultValue: Story = {
  render: () => (
    <Select defaultValue="gemini-2">
      <SelectTrigger style={{ width: 240 }}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="gemini-2">Gemini 2.0 Flash</SelectItem>
        <SelectItem value="gemini-2-pro">Gemini 2.0 Pro</SelectItem>
        <SelectItem value="claude-3-5">Claude 3.5 Sonnet</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Controlled: Story = {
  render: () => {
    const [val, setVal] = useState('');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
        <Select value={val} onValueChange={setVal}>
          <SelectTrigger style={{ width: 240 }}><SelectValue placeholder="Pick your hive..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="forge">🔥 FORGE</SelectItem>
            <SelectItem value="atlas">🗺️ ATLAS</SelectItem>
            <SelectItem value="genesis">🧬 GENESIS</SelectItem>
            <SelectItem value="phantom">👻 PHANTOM</SelectItem>
          </SelectContent>
        </Select>
        {val && <span style={{ fontSize: 13, color: '#71717a' }}>Selected: {val}</span>}
      </div>
    );
  },
};
