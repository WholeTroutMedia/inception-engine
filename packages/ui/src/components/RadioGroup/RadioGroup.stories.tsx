import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { RadioGroup, RadioGroupItem } from './RadioGroup';

const meta: Meta<typeof RadioGroup> = {
  title: 'Components/RadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof RadioGroup>;

// RadioGroupItem doesn't have label/description built-in — compose with label elements
const LabeledItem = ({ value, label, description, disabled }: { value: string; label: string; description?: string; disabled?: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
    <RadioGroupItem value={value} disabled={disabled} id={`radio-${value}`} style={{ marginTop: description ? 2 : 0 }} />
    <label htmlFor={`radio-${value}`} style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
      {description && <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>{description}</div>}
    </label>
  </div>
);

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="gemini" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <LabeledItem value="gemini" label="Gemini 2.0 Flash" />
      <LabeledItem value="claude" label="Claude 3.5 Sonnet" />
      <LabeledItem value="gpt4o" label="GPT-4o" />
    </RadioGroup>
  ),
};
export const WithDescriptions: Story = {
  render: () => (
    <RadioGroup defaultValue="pro" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <LabeledItem value="free" label="Free" description="5 workflows · 1k API calls/mo" />
      <LabeledItem value="pro" label="Pro — $29/mo" description="Unlimited workflows · 100k API calls/mo" />
      <LabeledItem value="enterprise" label="Enterprise" description="Custom limits · SLA · dedicated support" />
    </RadioGroup>
  ),
};
export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue="active" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <LabeledItem value="active" label="Active" />
      <LabeledItem value="paused" label="Paused (unavailable)" disabled />
    </RadioGroup>
  ),
};
export const Controlled: Story = {
  render: () => {
    const [val, setVal] = useState('daily');
    return (
      <div>
        <RadioGroup value={val} onValueChange={setVal} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <LabeledItem value="hourly" label="Hourly" />
          <LabeledItem value="daily" label="Daily" />
          <LabeledItem value="weekly" label="Weekly" />
        </RadioGroup>
        <p style={{ marginTop: 12, fontSize: 13, color: '#71717a' }}>Selected: {val}</p>
      </div>
    );
  },
};
