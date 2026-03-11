// packages/ui/src/components/Card/Card.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from './Card.js';
import { Button } from '../Button/Button.js';
import { Badge } from '../Badge/Badge.js';

const meta: Meta<typeof Card> = {
    component: Card,
    title: 'Layout/Card',
    tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
    render: () => (
        <Card className="max-w-[400px]">
            <CardHeader>
                <CardTitle>Card Title</CardTitle>
            </CardHeader>
            <CardBody>This is the card body containing descriptive content.</CardBody>
            <CardFooter>
                <Button size="sm" variant="primary">Action</Button>
                <Button size="sm" variant="ghost">Cancel</Button>
            </CardFooter>
        </Card>
    ),
};

export const WithBadge: Story = {
    render: () => (
        <Card className="max-w-[400px]">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Project Status</CardTitle>
                    <Badge variant="success">Active</Badge>
                </div>
            </CardHeader>
            <CardBody>Campaign is live and generating leads at the expected rate.</CardBody>
        </Card>
    ),
};
