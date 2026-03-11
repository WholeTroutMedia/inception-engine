import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { CreatorSidebar, type CreatorTool } from './CreatorSidebar';
import { Button } from '../Button/Button';

// CreatorSidebar props: { open, onClose, defaultTool?, className? }
// It's a sliding toolbox sidebar with 8 productivity tools
const meta: Meta<typeof CreatorSidebar> = {
  title: 'Components/CreatorSidebar',
  component: CreatorSidebar,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof CreatorSidebar>;

const SidebarDemo = ({ defaultTool }: { defaultTool?: CreatorTool }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--inc-color-background-default)' }}>
      <Button onClick={() => setOpen(true)}>🛠️ Open Creator Toolbox</Button>
      <CreatorSidebar open={open} onClose={() => setOpen(false)} defaultTool={defaultTool} />
    </div>
  );
};

export const Default: Story = { render: () => <SidebarDemo /> };
export const PaletteOpen: Story = { render: () => <SidebarDemo defaultTool="palette" /> };
export const ContrastOpen: Story = { render: () => <SidebarDemo defaultTool="contrast" /> };
export const SlugifyOpen: Story = { render: () => <SidebarDemo defaultTool="slugify" /> };
