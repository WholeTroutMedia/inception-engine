import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs';

const meta: Meta<typeof Tabs> = {
  title: 'Components/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="overview" style={{ width: 560 }}>
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview"><p style={{ padding: '16px 0' }}>Overview content — metrics, activity, recent events.</p></TabsContent>
      <TabsContent value="analytics"><p style={{ padding: '16px 0' }}>Analytics content — charts, trends, conversion data.</p></TabsContent>
      <TabsContent value="settings"><p style={{ padding: '16px 0' }}>Settings content — configuration, preferences, integrations.</p></TabsContent>
    </Tabs>
  ),
};

export const WithDisabledTab: Story = {
  render: () => (
    <Tabs defaultValue="active" style={{ width: 560 }}>
      <TabsList>
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="paused" disabled>Paused</TabsTrigger>
        <TabsTrigger value="archived">Archived</TabsTrigger>
      </TabsList>
      <TabsContent value="active"><p style={{ padding: '16px 0' }}>Showing active workflows.</p></TabsContent>
      <TabsContent value="archived"><p style={{ padding: '16px 0' }}>Showing archived workflows.</p></TabsContent>
    </Tabs>
  ),
};
