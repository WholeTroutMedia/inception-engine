import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect, useState } from 'react';
import { Progress } from './Progress';

const meta: Meta<typeof Progress> = {
  title: 'Components/Progress',
  component: Progress,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: { value: { control: { type: 'range', min: 0, max: 100, step: 1 } } },
};
export default meta;
type Story = StoryObj<typeof Progress>;

export const Default: Story = { args: { value: 65 } };
export const Complete: Story = { args: { value: 100 } };
export const AtZero: Story = { args: { value: 0 } };
export const AnimatedFill: Story = {
  render: () => {
    const [val, setVal] = useState(0);
    useEffect(() => {
      const t = setInterval(() => setVal(v => v >= 100 ? 0 : v + 2), 80);
      return () => clearInterval(t);
    }, []);
    return (
      <div style={{ width: 480 }}>
        <div style={{ fontSize: 13, color: '#71717a', marginBottom: 8 }}>Deploying... {val}%</div>
        <Progress value={val} />
      </div>
    );
  },
};
export const MultiBar: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 480 }}>
      {[{ label: 'FORGE', v: 72 }, { label: 'ATLAS', v: 45 }, { label: 'GENESIS', v: 91 }, { label: 'PHANTOM', v: 30 }].map(({ label, v }) => (
        <div key={label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span>{label}</span><span>{v}%</span>
          </div>
          <Progress value={v} />
        </div>
      ))}
    </div>
  ),
};
