import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './Accordion';

const meta: Meta<typeof Accordion> = {
  title: 'Components/Accordion',
  component: Accordion,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof Accordion>;

export const Single: Story = {
  render: () => (
    <Accordion type="single" collapsible style={{ width: 480 }}>
      <AccordionItem value="item-1">
        <AccordionTrigger>What is the Creative Liberation Engine?</AccordionTrigger>
        <AccordionContent>A 40-agent agentic operating system built to run creative and technical workflows at scale.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Who is AVERI?</AccordionTrigger>
        <AccordionContent>AVERI is the leadership collective — ATHENA (strategy), VERA (memory/quality), IRIS (creative execution).</AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>What is ATELIER?</AccordionTrigger>
        <AccordionContent>ATELIER is the Creative Liberation Engine design system — 8 layers from tokens to generative UI.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const Multiple: Story = {
  render: () => (
    <Accordion type="multiple" style={{ width: 480 }}>
      <AccordionItem value="a"><AccordionTrigger>Layer 1 — Tokens</AccordionTrigger><AccordionContent>W3C DTCG format compiled by Style Dictionary v4.</AccordionContent></AccordionItem>
      <AccordionItem value="b"><AccordionTrigger>Layer 2 — Components</AccordionTrigger><AccordionContent>Radix UI + CVA compositions consuming design tokens.</AccordionContent></AccordionItem>
      <AccordionItem value="c"><AccordionTrigger>Layer 3 — Themes</AccordionTrigger><AccordionContent>Token remapping per theme — default, dark, light, high-contrast.</AccordionContent></AccordionItem>
    </Accordion>
  ),
};
