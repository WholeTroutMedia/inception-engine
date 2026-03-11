import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal';
import { Button } from '../Button/Button';

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof Modal>;

const ModalDemo = ({ title, children, size }: { title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open {title}</Button>
      <Modal open={open} onOpenChange={setOpen} size={size}>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody>{children}</ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => setOpen(false)}>Confirm</Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export const Default: Story = { render: () => <ModalDemo title="Create Workflow">Configure your new automation workflow below.</ModalDemo> };
export const Small: Story = { render: () => <ModalDemo title="Confirm action" size="sm">Are you sure you want to delete this item? This action cannot be undone.</ModalDemo> };
export const Large: Story = { render: () => <ModalDemo title="Edit Configuration" size="lg">A larger modal for complex forms or multi-step content. Add your form fields here.</ModalDemo> };
export const Destructive: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="danger" onClick={() => setOpen(true)}>Delete Account</Button>
        <Modal open={open} onOpenChange={setOpen} size="sm">
          <ModalHeader>Delete account permanently?</ModalHeader>
          <ModalBody>This will delete all your data, workflows, and API keys. This action is irreversible.</ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => setOpen(false)}>Delete Forever</Button>
          </ModalFooter>
        </Modal>
      </>
    );
  },
};
