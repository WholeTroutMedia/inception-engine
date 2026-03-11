import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './Table';
import { Badge } from '../Badge/Badge';

const meta: Meta<typeof Table> = {
  title: 'Components/Table',
  component: Table,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof Table>;

const agents = [
  { name: 'FORGE', hive: 'BUILD', status: 'active', tasks: 12 },
  { name: 'ATLAS', hive: 'NAVIGATE', status: 'idle', tasks: 0 },
  { name: 'GENESIS', hive: 'CREATE', status: 'active', tasks: 7 },
  { name: 'PHANTOM', hive: 'INFILTRATE', status: 'paused', tasks: 2 },
  { name: 'CHRONOS', hive: 'TIME', status: 'active', tasks: 4 },
];

const statusColor: Record<string, string> = { active: 'success', idle: 'default', paused: 'warning' };

export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Agent</TableHead>
          <TableHead>Hive</TableHead>
          <TableHead>Status</TableHead>
          <TableHead style={{ textAlign: 'right' }}>Active Tasks</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {agents.map(a => (
          <TableRow key={a.name}>
            <TableCell style={{ fontWeight: 600 }}>{a.name}</TableCell>
            <TableCell style={{ color: '#71717a' }}>{a.hive}</TableCell>
            <TableCell><Badge variant={statusColor[a.status] as any}>{a.status}</Badge></TableCell>
            <TableCell style={{ textAlign: 'right' }}>{a.tasks}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

export const Empty: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Agent</TableHead>
          <TableHead>Hive</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell colSpan={3} style={{ textAlign: 'center', color: '#71717a', padding: '32px 0' }}>
            No agents found. Spawn your first agent to get started.
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
