import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Text } from './Text';

const meta: Meta<typeof Text> = {
  title: 'Components/Text',
  component: Text,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'select', options: ['xs', 'sm', 'base', 'lg', 'xl'] },
    weight: { control: 'select', options: ['normal', 'medium', 'semibold', 'bold'] },
    color: { control: 'select', options: ['primary', 'secondary', 'muted', 'brand', 'danger'] },
  },
};
export default meta;
type Story = StoryObj<typeof Text>;

export const Default: Story = { args: { children: 'The Creative Liberation Engine is a 40-agent agentic operating system built for creative and technical mastery.' } };
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {(['xs', 'sm', 'base', 'lg', 'xl'] as const).map(size => (
        <Text key={size} size={size}>{size}: The quick brown fox jumps over the lazy dog</Text>
      ))}
    </div>
  ),
};
export const Colors: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Text color="primary">Primary text — main content</Text>
      <Text color="secondary">Secondary text — supporting detail</Text>
      <Text color="muted">Muted text — timestamps, metadata</Text>
      <Text color="brand">Brand text — important callouts</Text>
      <Text color="danger">Danger text — error messages</Text>
    </div>
  ),
};
export const Truncated: Story = { args: { truncate: true, children: 'This is a very long piece of text that will be truncated with an ellipsis when it exceeds the width of its container element' } };
