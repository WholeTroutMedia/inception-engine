import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from './DropdownMenu';
import { Button } from '../Button/Button';

const meta: Meta<typeof DropdownMenu> = {
  title: 'Components/DropdownMenu',
  component: DropdownMenu,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof DropdownMenu>;

export const Default: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="secondary">Options ▾</Button></DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem>Edit workflow</DropdownMenuItem>
        <DropdownMenuItem>Duplicate</DropdownMenuItem>
        <DropdownMenuItem>Export as JSON</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

export const WithEmoji: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button size="sm" variant="ghost">⋮</Button></DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>✏️ Edit</DropdownMenuItem>
        <DropdownMenuItem>📋 Copy link</DropdownMenuItem>
        <DropdownMenuItem>🔗 Share</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>🗑️ Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

export const AgentMenu: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button>Assign Agent ▾</Button></DropdownMenuTrigger>
      <DropdownMenuContent style={{ minWidth: 200 }}>
        <DropdownMenuLabel>Available Agents</DropdownMenuLabel>
        <DropdownMenuItem>🔥 FORGE</DropdownMenuItem>
        <DropdownMenuItem>🗺️ ATLAS</DropdownMenuItem>
        <DropdownMenuItem>🧬 GENESIS</DropdownMenuItem>
        <DropdownMenuItem>👻 PHANTOM</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>+ Spawn new agent</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
