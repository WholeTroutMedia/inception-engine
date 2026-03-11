import axios from 'axios';
import { z } from 'zod';

// ─── THE PLUG — HubSpot CRM MCP Adapter ──────────────────────────────────────
// Connects Creative Liberation Engine agents to HubSpot CRM for contact, deal,
// and pipeline management with full bi-directional sync.

const HUBSPOT_BASE = 'https://api.hubapi.com';

const ENV_HS = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };

function hsHeaders() {
    const token = ENV_HS.process?.env?.['HUBSPOT_API_KEY'];
    if (!token) throw new Error('HUBSPOT_API_KEY not configured');
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ─── Contact Schemas ───────────────────────────────────────────────────────────

export const ListContactsSchema = z.object({
    limit: z.number().min(1).max(100).default(20),
    properties: z.array(z.string()).default(['firstname', 'lastname', 'email', 'phone', 'company', 'lifecyclestage']),
    after: z.string().optional().describe('Pagination cursor from previous call'),
});

export const GetContactSchema = z.object({
    contact_id: z.string().describe('HubSpot contact ID or email address'),
    properties: z.array(z.string()).default(['firstname', 'lastname', 'email', 'phone', 'company', 'lifecyclestage', 'createdate', 'lastmodifieddate']),
});

export const CreateContactSchema = z.object({
    email: z.string().email(),
    firstname: z.string().optional(),
    lastname: z.string().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    website: z.string().optional(),
    lifecyclestage: z.enum(['subscriber', 'lead', 'marketingqualifiedlead', 'salesqualifiedlead', 'opportunity', 'customer', 'evangelist']).optional(),
    extra_properties: z.record(z.string()).optional().describe('Any additional HubSpot contact properties'),
});

export const UpdateContactSchema = z.object({
    contact_id: z.string(),
    properties: z.record(z.string()).describe('Properties to update (key: HubSpot property name)'),
});

export const SearchContactsSchema = z.object({
    query: z.string().describe('Full-text search query'),
    limit: z.number().min(1).max(100).default(10),
    properties: z.array(z.string()).default(['firstname', 'lastname', 'email', 'company', 'lifecyclestage']),
});

// ─── Deal Schemas ──────────────────────────────────────────────────────────────

export const ListDealsSchema = z.object({
    limit: z.number().min(1).max(100).default(20),
    properties: z.array(z.string()).default(['dealname', 'amount', 'dealstage', 'closedate', 'pipeline']),
    after: z.string().optional(),
});

export const CreateDealSchema = z.object({
    dealname: z.string(),
    amount: z.number().optional().describe('Deal value in dollars'),
    dealstage: z.string().optional().describe('HubSpot deal stage ID'),
    pipeline: z.string().optional().describe('HubSpot pipeline ID (default: default pipeline)'),
    closedate: z.string().optional().describe('Expected close date (ISO 8601)'),
    contact_id: z.string().optional().describe('Associate deal with this contact ID'),
    extra_properties: z.record(z.string()).optional(),
});

export const UpdateDealSchema = z.object({
    deal_id: z.string(),
    properties: z.record(z.string()),
});

// ─── Note Schema ───────────────────────────────────────────────────────────────

export const CreateNoteSchema = z.object({
    body: z.string().describe('Note content (plain text or HTML)'),
    contact_id: z.string().optional().describe('Associate with a contact'),
    deal_id: z.string().optional().describe('Associate with a deal'),
    timestamp: z.string().optional().describe('Note timestamp (ISO 8601, defaults to now)'),
});

// ─── Contacts ─────────────────────────────────────────────────────────────────

interface HsObject { id: string; properties: Record<string, string | null> }
interface HsListResponse { results: HsObject[]; paging?: { next?: { after: string } } }

export async function listContacts(input: z.infer<typeof ListContactsSchema>) {
    const v = ListContactsSchema.parse(input);
    const res = await axios.get<HsListResponse>(`${HUBSPOT_BASE}/crm/v3/objects/contacts`, {
        headers: hsHeaders(),
        params: { limit: v.limit, properties: v.properties.join(','), after: v.after },
    });
    return {
        contacts: res.data.results.map(r => ({ id: r.id, ...r.properties })),
        next_cursor: res.data.paging?.next?.after,
    };
}

export async function getContact(input: z.infer<typeof GetContactSchema>) {
    const v = GetContactSchema.parse(input);
    // Support lookup by email via search
    const isEmail = v.contact_id.includes('@');
    if (isEmail) {
        const searched = await searchContacts({ query: v.contact_id, limit: 1, properties: v.properties });
        if (!searched.contacts.length) throw new Error(`No contact found with email: ${v.contact_id}`);
        return searched.contacts[0];
    }
    const res = await axios.get<HsObject>(`${HUBSPOT_BASE}/crm/v3/objects/contacts/${v.contact_id}`, {
        headers: hsHeaders(),
        params: { properties: v.properties.join(',') },
    });
    return { id: res.data.id, ...res.data.properties };
}

export async function createContact(input: z.infer<typeof CreateContactSchema>) {
    const v = CreateContactSchema.parse(input);
    console.log(`[PLUG/HUBSPOT] ➕ Creating contact: ${v.email}`);
    const properties: Record<string, string> = { email: v.email };
    if (v.firstname) properties.firstname = v.firstname;
    if (v.lastname) properties.lastname = v.lastname;
    if (v.phone) properties.phone = v.phone;
    if (v.company) properties.company = v.company;
    if (v.website) properties.website = v.website;
    if (v.lifecyclestage) properties.lifecyclestage = v.lifecyclestage;
    if (v.extra_properties) Object.assign(properties, v.extra_properties);

    const res = await axios.post<HsObject>(`${HUBSPOT_BASE}/crm/v3/objects/contacts`, { properties }, { headers: hsHeaders() });
    return { id: res.data.id, ...res.data.properties };
}

export async function updateContact(input: z.infer<typeof UpdateContactSchema>) {
    const v = UpdateContactSchema.parse(input);
    const res = await axios.patch<HsObject>(`${HUBSPOT_BASE}/crm/v3/objects/contacts/${v.contact_id}`, { properties: v.properties }, { headers: hsHeaders() });
    return { id: res.data.id, ...res.data.properties };
}

export async function searchContacts(input: z.infer<typeof SearchContactsSchema>) {
    const v = SearchContactsSchema.parse(input);
    const res = await axios.post<HsListResponse>(
        `${HUBSPOT_BASE}/crm/v3/objects/contacts/search`,
        {
            query: v.query,
            limit: v.limit,
            properties: v.properties,
        },
        { headers: hsHeaders() }
    );
    return { contacts: res.data.results.map(r => ({ id: r.id, ...r.properties })), total: res.data.results.length };
}

// ─── Deals ────────────────────────────────────────────────────────────────────

export async function listDeals(input: z.infer<typeof ListDealsSchema>) {
    const v = ListDealsSchema.parse(input);
    const res = await axios.get<HsListResponse>(`${HUBSPOT_BASE}/crm/v3/objects/deals`, {
        headers: hsHeaders(),
        params: { limit: v.limit, properties: v.properties.join(','), after: v.after },
    });
    return {
        deals: res.data.results.map(r => ({ id: r.id, ...r.properties })),
        next_cursor: res.data.paging?.next?.after,
    };
}

export async function createDeal(input: z.infer<typeof CreateDealSchema>) {
    const v = CreateDealSchema.parse(input);
    console.log(`[PLUG/HUBSPOT] ➕ Creating deal: ${v.dealname}`);

    const properties: Record<string, string> = { dealname: v.dealname };
    if (v.amount !== undefined) properties.amount = String(v.amount);
    if (v.dealstage) properties.dealstage = v.dealstage;
    if (v.pipeline) properties.pipeline = v.pipeline;
    if (v.closedate) properties.closedate = v.closedate;
    if (v.extra_properties) Object.assign(properties, v.extra_properties);

    const res = await axios.post<HsObject>(`${HUBSPOT_BASE}/crm/v3/objects/deals`, { properties }, { headers: hsHeaders() });
    const deal = { id: res.data.id, ...res.data.properties };

    // Associate with contact if provided
    if (v.contact_id) {
        await axios.put(
            `${HUBSPOT_BASE}/crm/v3/objects/deals/${deal.id}/associations/contacts/${v.contact_id}/3`,
            {},
            { headers: hsHeaders() }
        );
    }

    return deal;
}

export async function updateDeal(input: z.infer<typeof UpdateDealSchema>) {
    const v = UpdateDealSchema.parse(input);
    const res = await axios.patch<HsObject>(`${HUBSPOT_BASE}/crm/v3/objects/deals/${v.deal_id}`, { properties: v.properties }, { headers: hsHeaders() });
    return { id: res.data.id, ...res.data.properties };
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export async function createNote(input: z.infer<typeof CreateNoteSchema>) {
    const v = CreateNoteSchema.parse(input);
    const timestamp = v.timestamp ?? new Date().toISOString();

    const res = await axios.post<HsObject>(
        `${HUBSPOT_BASE}/crm/v3/objects/notes`,
        { properties: { hs_note_body: v.body, hs_timestamp: timestamp } },
        { headers: hsHeaders() }
    );
    const note = { id: res.data.id, ...res.data.properties };

    // Associate with contact/deal
    const assocCalls: Promise<unknown>[] = [];
    if (v.contact_id) {
        assocCalls.push(axios.put(`${HUBSPOT_BASE}/crm/v3/objects/notes/${note.id}/associations/contacts/${v.contact_id}/202`, {}, { headers: hsHeaders() }));
    }
    if (v.deal_id) {
        assocCalls.push(axios.put(`${HUBSPOT_BASE}/crm/v3/objects/notes/${note.id}/associations/deals/${v.deal_id}/214`, {}, { headers: hsHeaders() }));
    }
    await Promise.allSettled(assocCalls);

    return note;
}

// ─── Pipelines ────────────────────────────────────────────────────────────────

export async function listPipelines() {
    const res = await axios.get<{ results: Array<{ id: string; label: string; stages: Array<{ id: string; label: string; displayOrder: number }> }> }>(
        `${HUBSPOT_BASE}/crm/v3/pipelines/deals`,
        { headers: hsHeaders() }
    );
    return {
        pipelines: res.data.results.map(p => ({
            id: p.id,
            label: p.label,
            stages: p.stages.sort((a, b) => a.displayOrder - b.displayOrder).map(s => ({ id: s.id, label: s.label })),
        })),
    };
}

// ─── MCP Tool Registration ────────────────────────────────────────────────────

export const HUBSPOT_MCP_TOOLS = [
    {
        name: 'hubspot_list_contacts',
        description: 'List HubSpot contacts with property selection and pagination.',
        inputSchema: ListContactsSchema,
        handler: listContacts,
        agentPermissions: ['ORACLE', 'RELAY', 'ZERO_DAY'],
        estimatedCost: 'Free',
    },
    {
        name: 'hubspot_get_contact',
        description: 'Get a HubSpot contact by ID or email address.',
        inputSchema: GetContactSchema,
        handler: getContact,
        agentPermissions: ['ORACLE', 'RELAY', 'ZERO_DAY'],
        estimatedCost: 'Free',
    },
    {
        name: 'hubspot_create_contact',
        description: 'Create a new HubSpot contact with standard and custom properties.',
        inputSchema: CreateContactSchema,
        handler: createContact,
        agentPermissions: ['ORACLE', 'ZERO_DAY'],
        estimatedCost: 'Free',
    },
    {
        name: 'hubspot_update_contact',
        description: 'Update any HubSpot contact properties by ID.',
        inputSchema: UpdateContactSchema,
        handler: updateContact,
        agentPermissions: ['ORACLE', 'ZERO_DAY'],
        estimatedCost: 'Free',
    },
    {
        name: 'hubspot_search_contacts',
        description: 'Full-text search across HubSpot contacts.',
        inputSchema: SearchContactsSchema,
        handler: searchContacts,
        agentPermissions: ['ORACLE', 'RELAY', 'ZERO_DAY'],
        estimatedCost: 'Free',
    },
    {
        name: 'hubspot_list_deals',
        description: 'List all HubSpot deals with property selection and pagination.',
        inputSchema: ListDealsSchema,
        handler: listDeals,
        agentPermissions: ['ORACLE', 'ZERO_DAY'],
        estimatedCost: 'Free',
    },
    {
        name: 'hubspot_create_deal',
        description: 'Create a new deal in HubSpot and optionally associate it with a contact.',
        inputSchema: CreateDealSchema,
        handler: createDeal,
        agentPermissions: ['ORACLE', 'ZERO_DAY'],
        estimatedCost: 'Free',
    },
    {
        name: 'hubspot_update_deal',
        description: 'Update HubSpot deal properties (e.g. close date, stage, amount).',
        inputSchema: UpdateDealSchema,
        handler: updateDeal,
        agentPermissions: ['ORACLE', 'ZERO_DAY'],
        estimatedCost: 'Free',
    },
    {
        name: 'hubspot_create_note',
        description: 'Create a CRM note and associate it with a contact and/or deal.',
        inputSchema: CreateNoteSchema,
        handler: createNote,
        agentPermissions: ['ORACLE', 'ZERO_DAY'],
        estimatedCost: 'Free',
    },
    {
        name: 'hubspot_list_pipelines',
        description: 'List all HubSpot deal pipelines and their stages.',
        inputSchema: z.object({}),
        handler: listPipelines,
        agentPermissions: ['ORACLE', 'ZERO_DAY'],
        estimatedCost: 'Free',
    },
];
