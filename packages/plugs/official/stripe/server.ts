import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Stripe from 'stripe';

// ─── Stripe MCP Adapter ───────────────────────────────────────────────────────
// Agent: COMMERCE, WARREN_BUFFETT, STUDIO, ZERO_DAY
// Provides full Stripe API surface as MCP tools

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia',
});

const server = new Server(
    { name: 'inception-plug-stripe', version: '1.0.0' },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: 'stripe_create_product',
            description: 'Create a new product in Stripe',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Product name' },
                    description: { type: 'string', description: 'Product description' },
                    metadata: { type: 'object', description: 'Key-value metadata' },
                },
                required: ['name'],
            },
        },
        {
            name: 'stripe_create_price',
            description: 'Create a price for a product',
            inputSchema: {
                type: 'object',
                properties: {
                    product_id: { type: 'string' },
                    amount: { type: 'number', description: 'Amount in cents' },
                    currency: { type: 'string', default: 'usd' },
                    recurring_interval: { type: 'string', enum: ['month', 'year'], description: 'For subscriptions' },
                },
                required: ['product_id', 'amount', 'currency'],
            },
        },
        {
            name: 'stripe_create_payment_link',
            description: 'Create a Stripe payment link for a price',
            inputSchema: {
                type: 'object',
                properties: {
                    price_id: { type: 'string' },
                    quantity: { type: 'number', default: 1 },
                    after_completion_url: { type: 'string' },
                },
                required: ['price_id'],
            },
        },
        {
            name: 'stripe_create_invoice',
            description: 'Create and send an invoice to a customer',
            inputSchema: {
                type: 'object',
                properties: {
                    customer_email: { type: 'string' },
                    customer_name: { type: 'string' },
                    line_items: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                description: { type: 'string' },
                                amount: { type: 'number', description: 'Amount in cents' },
                                quantity: { type: 'number' },
                            },
                        },
                    },
                    due_days: { type: 'number', default: 30 },
                    memo: { type: 'string' },
                },
                required: ['customer_email', 'line_items'],
            },
        },
        {
            name: 'stripe_list_customers',
            description: 'List customers with optional search',
            inputSchema: {
                type: 'object',
                properties: {
                    email: { type: 'string', description: 'Filter by email' },
                    limit: { type: 'number', default: 10 },
                },
            },
        },
        {
            name: 'stripe_get_revenue_summary',
            description: 'Get revenue summary for a time period',
            inputSchema: {
                type: 'object',
                properties: {
                    period: { type: 'string', enum: ['today', 'this_week', 'this_month', 'this_year', 'all_time'] },
                },
                required: ['period'],
            },
        },
        {
            name: 'stripe_create_subscription',
            description: 'Create a subscription for a customer',
            inputSchema: {
                type: 'object',
                properties: {
                    customer_email: { type: 'string' },
                    price_id: { type: 'string' },
                    trial_days: { type: 'number' },
                    metadata: { type: 'object' },
                },
                required: ['customer_email', 'price_id'],
            },
        },
    ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case 'stripe_create_product': {
                const product = await stripe.products.create({
                    name: args.name as string,
                    description: args.description as string | undefined,
                    metadata: args.metadata as Record<string, string> | undefined,
                });
                return { content: [{ type: 'text', text: JSON.stringify(product, null, 2) }] };
            }

            case 'stripe_create_price': {
                const price = await stripe.prices.create({
                    product: args.product_id as string,
                    unit_amount: args.amount as number,
                    currency: (args.currency as string) || 'usd',
                    ...(args.recurring_interval && {
                        recurring: { interval: args.recurring_interval as 'month' | 'year' },
                    }),
                });
                return { content: [{ type: 'text', text: JSON.stringify(price, null, 2) }] };
            }

            case 'stripe_create_payment_link': {
                const link = await stripe.paymentLinks.create({
                    line_items: [{ price: args.price_id as string, quantity: (args.quantity as number) || 1 }],
                    after_completion: args.after_completion_url
                        ? { type: 'redirect', redirect: { url: args.after_completion_url as string } }
                        : { type: 'hosted_confirmation' },
                });
                return { content: [{ type: 'text', text: JSON.stringify({ url: link.url, id: link.id }) }] };
            }

            case 'stripe_create_invoice': {
                // Find or create customer
                const customers = await stripe.customers.list({ email: args.customer_email as string, limit: 1 });
                let customer = customers.data[0];
                if (!customer) {
                    customer = await stripe.customers.create({
                        email: args.customer_email as string,
                        name: args.customer_name as string | undefined,
                    });
                }

                const invoice = await stripe.invoices.create({
                    customer: customer.id,
                    collection_method: 'send_invoice',
                    days_until_due: (args.due_days as number) || 30,
                    description: args.memo as string | undefined,
                });

                const lineItems = args.line_items as Array<{ description: string; amount: number; quantity?: number }>;
                for (const item of lineItems) {
                    await stripe.invoiceItems.create({
                        customer: customer.id,
                        invoice: invoice.id,
                        description: item.description,
                        amount: item.amount,
                        currency: 'usd',
                        quantity: item.quantity || 1,
                    });
                }

                const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
                await stripe.invoices.sendInvoice(invoice.id);

                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            invoice_id: finalized.id,
                            invoice_url: finalized.hosted_invoice_url,
                            amount_due: finalized.amount_due / 100,
                            status: finalized.status,
                        }, null, 2),
                    }],
                };
            }

            case 'stripe_list_customers': {
                const customers = await stripe.customers.list({
                    email: args.email as string | undefined,
                    limit: (args.limit as number) || 10,
                });
                return { content: [{ type: 'text', text: JSON.stringify(customers.data.map(c => ({ id: c.id, email: c.email, name: c.name, created: c.created })), null, 2) }] };
            }

            case 'stripe_get_revenue_summary': {
                const now = Math.floor(Date.now() / 1000);
                const periods: Record<string, number> = {
                    today: now - 86400,
                    this_week: now - 604800,
                    this_month: now - 2592000,
                    this_year: now - 31536000,
                    all_time: 0,
                };
                const since = periods[args.period as string] || 0;
                const charges = await stripe.charges.list({ created: { gte: since }, limit: 100 });
                const total = charges.data.filter(c => c.paid).reduce((sum, c) => sum + c.amount, 0);
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            period: args.period,
                            total_revenue: `$${(total / 100).toFixed(2)}`,
                            transaction_count: charges.data.filter(c => c.paid).length,
                        }, null, 2),
                    }],
                };
            }

            case 'stripe_create_subscription': {
                const customers = await stripe.customers.list({ email: args.customer_email as string, limit: 1 });
                let customer = customers.data[0];
                if (!customer) {
                    customer = await stripe.customers.create({ email: args.customer_email as string });
                }
                const sub = await stripe.subscriptions.create({
                    customer: customer.id,
                    items: [{ price: args.price_id as string }],
                    trial_period_days: args.trial_days as number | undefined,
                    metadata: args.metadata as Record<string, string> | undefined,
                });
                return { content: [{ type: 'text', text: JSON.stringify({ subscription_id: sub.id, status: sub.status }, null, 2) }] };
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true };
    }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Stripe MCP adapter running (COMMERCE, WARREN_BUFFETT, STUDIO, ZERO_DAY)');
