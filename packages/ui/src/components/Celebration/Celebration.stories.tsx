import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Celebration } from './Celebration';
import { Button } from '../Button/Button';

const meta: Meta<typeof Celebration> = {
  title: 'Components/Celebration',
  component: Celebration,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof Celebration>;

export const Default: Story = {
  render: () => {
    const [active, setActive] = useState(false);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <Button onClick={() => { setActive(true); setTimeout(() => setActive(false), 3000); }}>
          🎉 Trigger Celebration
        </Button>
        {active && <Celebration message="Score: 100/100 — Perfect design token compliance!" />}
      </div>
    );
  },
};
export const QualityScore: Story = {
  render: () => <Celebration message="VERA-DESIGN Score: 97 — Exceptional!" variant="score" score={97} />,
};
