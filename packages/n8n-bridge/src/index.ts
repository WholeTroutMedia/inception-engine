import express from 'express';
import { EventEmitter } from 'events';

export interface N8nWebhookPayload {
    workflowName: string;
    executionId: string;
    data: Record<string, any>;
}

/**
 * n8n Workflow Automation Bridge
 * Integrates Creative Liberation Engine Agents with the n8n Workflow Orchestration Layer.
 */
export class N8nBridge extends EventEmitter {
    private webhookUrl: string;
    private apiKey?: string;

    constructor(webhookUrl: string = process.env.N8N_WEBHOOK_URL || '', apiKey?: string) {
        super();
        this.webhookUrl = webhookUrl;
        this.apiKey = apiKey || process.env.N8N_API_KEY;
    }

    public async connect(): Promise<void> {
        console.log(`[n8n Bridge] Connected to workflow layer at ${this.webhookUrl}`);
    }

    /**
     * Trigger an external n8n workflow.
     */
    public async triggerWorkflow(workflowIdOrSlug: string, payload: Record<string, any>): Promise<any> {
        if (!this.webhookUrl) {
            console.warn('[n8n Bridge] Webhook URL not configured. Skipping workflow trigger.');
            return null;
        }

        const url = `${this.webhookUrl}/webhook/${workflowIdOrSlug}`;
        
        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };
            if (this.apiKey) {
                headers['X-N8N-API-KEY'] = this.apiKey; // Depending on n8n auth setup
            }

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`n8n responded with status ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`[n8n Bridge] Successfully triggered workflow ${workflowIdOrSlug}`);
            return data;
        } catch (error) {
            console.error(`[n8n Bridge] Error triggering workflow ${workflowIdOrSlug}:`, error);
            throw error;
        }
    }

    /**
     * Express middleware to receive callbacks from n8n workflows.
     */
    public getWebhookMiddleware() {
        return (req: express.Request, res: express.Response, next: express.NextFunction) => {
            try {
                const payload = req.body as N8nWebhookPayload;
                console.log(`[n8n Bridge] Received webhook from workflow: ${payload.workflowName}`);
                
                this.emit('webhook_received', payload);
                this.emit(`webhook:${payload.workflowName}`, payload);
                
                res.status(200).json({ status: 'received' });
            } catch (error) {
                console.error('[n8n Bridge] Invalid webhook payload', error);
                res.status(400).json({ error: 'Invalid payload' });
            }
        };
    }
}
