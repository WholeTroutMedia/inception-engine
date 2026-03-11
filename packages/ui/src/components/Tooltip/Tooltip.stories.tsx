import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Tooltip, TooltipProvider } from './Tooltip';
import { Button } from '../Button/Button';

const meta: Meta<typeof Tooltip> = {
  title: 'Components/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  decorators: [(Story) => <TooltipProvider><div style={{ padding: 48 }}><Story /></div></TooltipProvider>],
};
export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  render: () => <Tooltip content="This is a tooltip"><Button variant="secondary">Hover me</Button></Tooltip>,
};
export const OnIcon: Story = {
  render: () => (
    <Tooltip content="Settings" side="right">
      <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>⚙️</button>
    </Tooltip>
  ),
};
export const WithDelay: Story = {
  render: () => (
    <Tooltip content="Appeared after 800ms delay" delayDuration={800}>
      <Button>Slow tooltip (800ms)</Button>
    </Tooltip>
  ),
};
export const Positions: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
      {(['top', 'right', 'bottom', 'left'] as const).map(side => (
        <Tooltip key={side} content={`Tooltip on ${side}`} side={side}>
          <Button variant="secondary" size="sm">{side}</Button>
        </Tooltip>
      ))}
    </div>
  ),
};
