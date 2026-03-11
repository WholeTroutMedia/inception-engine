import axios from 'axios';
import { z } from 'zod';

// ─── THE PLUG — Airtable MCP Adapter ─────────────────────────────────────────
// Connects Creative Liberation Engine agents to Airtable for structured data management,
// client databases, content calendars, and asset tracking.

const AIRTABLE_BASE = 'https://api.airtable.com/v0';
const META_BASE = 'https://api.airtable.com/v0/meta';

const ENV_AT = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };

function airtableHeaders() {
    const token = ENV_AT.process?.env?.['AIRTABLE_API_KEY'];
    if (!token) throw new Error('AIRTABLE_API_KEY not configured');
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const ListRecordsSchema = z.object({
    base_id: z.string().describe('Airtable base ID (e.g. appXXXXXXXX)'),
    table_name: z.string().describe('Table name or table ID'),
    filter_formula: z.string().optional().describe('Airtable formula filter (e.g. {Status}="Active")'),
    fields: z.array(z.string()).optional().describe('Specific fields to return (default: all)'),
    sort: z.array(z.object({ field: z.string(), direction: z.enum(['asc', 'desc']) })).optional(),
    max_records: z.number().min(1).max(100).default(20),
    view: z.string().optional().describe('View name or ID to use'),
});

export const GetRecordSchema = z.object({
    base_id: z.string(),
    table_name: z.string(),
    record_id: z.string().describe('Airtable record ID (recXXXXXXXX)'),
});

export const CreateRecordSchema = z.object({
    base_id: z.string(),
    table_name: z.string(),
    fields: z.record(z.unknown()).describe('Field values to set on the new record'),
    typecast: z.boolean().default(false).describe('Auto-convert strings to correct types'),
});

export const UpdateRecordSchema = z.object({
    base_id: z.string(),
    table_name: z.string(),
    record_id: z.string(),
    fields: z.record(z.unknown()).describe('Fields to update (partial update — PATCH)'),
    typecast: z.boolean().default(false),
});

export const DeleteRecordSchema = z.object({
    base_id: z.string(),
    table_name: z.string(),
    record_id: z.string(),
});

export const BulkCreateSchema = z.object({
    base_id: z.string(),
    table_name: z.string(),
    records: z.array(z.record(z.unknown())).max(10).describe('Array of field objects (max 10 per call)'),
    typecast: z.boolean().default(false),
});

export const ListBasesSchema = z.object({});
export const ListTablesSchema = z.object({ base_id: z.string() });

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AirtableRecord {
    id: string;
    createdTime: string;
    fields: Record<string, unknown>;
}

interface AirtableListResponse {
    records: AirtableRecord[];
    offset?: string;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function listRecords(input: z.infer<typeof ListRecordsSchema>) {
    const v = ListRecordsSchema.parse(input);
    const params: Record<string, string | number | string[]> = { maxRecords: v.max_records };
    if (v.filter_formula) params['filterByFormula'] = v.filter_formula;
    if (v.view) params['view'] = v.view;
    if (v.fields?.length) params['fields[]'] = v.fields;
    if (v.sort?.length) {
        v.sort.forEach((s, i) => {
            params[`sort[${i}][field]`] = s.field;
            params[`sort[${i}][direction]`] = s.direction;
        });
    }

    const response = await axios.get<AirtableListResponse>(
        `${AIRTABLE_BASE}/${v.base_id}/${encodeURIComponent(v.table_name)}`,
        { headers: airtableHeaders(), params }
    );

    return {
        records: response.data.records.map(r => ({ id: r.id, created: r.createdTime, ...r.fields })),
        total: response.data.records.length,
        has_more: !!response.data.offset,
    };
}

export async function getRecord(input: z.infer<typeof GetRecordSchema>) {
    const v = GetRecordSchema.parse(input);
    const response = await axios.get<AirtableRecord>(
        `${AIRTABLE_BASE}/${v.base_id}/${encodeURIComponent(v.table_name)}/${v.record_id}`,
        { headers: airtableHeaders() }
    );
    return { id: response.data.id, created: response.data.createdTime, ...response.data.fields };
}

export async function createRecord(input: z.infer<typeof CreateRecordSchema>) {
    const v = CreateRecordSchema.parse(input);
    console.log(`[PLUG/AIRTABLE] ➕ Creating record in ${v.base_id}/${v.table_name}`);

    const response = await axios.post<AirtableRecord>(
        `${AIRTABLE_BASE}/${v.base_id}/${encodeURIComponent(v.table_name)}`,
        { fields: v.fields, typecast: v.typecast },
        { headers: airtableHeaders() }
    );
    return { id: response.data.id, created: response.data.createdTime, ...response.data.fields };
}

export async function updateRecord(input: z.infer<typeof UpdateRecordSchema>) {
    const v = UpdateRecordSchema.parse(input);
    console.log(`[PLUG/AIRTABLE] ✏️ Updating ${v.record_id}`);

    const response = await axios.patch<AirtableRecord>(
        `${AIRTABLE_BASE}/${v.base_id}/${encodeURIComponent(v.table_name)}/${v.record_id}`,
        { fields: v.fields, typecast: v.typecast },
        { headers: airtableHeaders() }
    );
    return { id: response.data.id, created: response.data.createdTime, ...response.data.fields };
}

export async function deleteRecord(input: z.infer<typeof DeleteRecordSchema>) {
    const v = DeleteRecordSchema.parse(input);
    console.log(`[PLUG/AIRTABLE] 🗑️ Deleting ${v.record_id}`);

    const response = await axios.delete<{ id: string; deleted: boolean }>(
        `${AIRTABLE_BASE}/${v.base_id}/${encodeURIComponent(v.table_name)}/${v.record_id}`,
        { headers: airtableHeaders() }
    );
    return response.data;
}

export async function bulkCreate(input: z.infer<typeof BulkCreateSchema>) {
    const v = BulkCreateSchema.parse(input);
    console.log(`[PLUG/AIRTABLE] ➕➕ Bulk creating ${v.records.length} records`);

    const response = await axios.post<{ records: AirtableRecord[] }>(
        `${AIRTABLE_BASE}/${v.base_id}/${encodeURIComponent(v.table_name)}`,
        { records: v.records.map(fields => ({ fields })), typecast: v.typecast },
        { headers: airtableHeaders() }
    );
    return {
        created: response.data.records.length,
        records: response.data.records.map(r => ({ id: r.id, ...r.fields })),
    };
}

export async function listBases() {
    const response = await axios.get<{
        bases: Array<{ id: string; name: string; permissionLevel: string }>;
    }>(`${META_BASE}/bases`, { headers: airtableHeaders() });
    return { bases: response.data.bases };
}

export async function listTables(input: z.infer<typeof ListTablesSchema>) {
    const response = await axios.get<{
        tables: Array<{ id: string; name: string; primaryFieldId: string; fields: Array<{ id: string; name: string; type: string }> }>;
    }>(`${META_BASE}/bases/${input.base_id}/tables`, { headers: airtableHeaders() });
    return {
        tables: response.data.tables.map(t => ({
            id: t.id,
            name: t.name,
            primary_field: t.primaryFieldId,
            fields: t.fields.map(f => ({ id: f.id, name: f.name, type: f.type })),
        })),
    };
}

// ─── MCP Tool Registration ────────────────────────────────────────────────────

export const AIRTABLE_MCP_TOOLS = [
    {
        name: 'airtable_list_records',
        description: 'List records from an Airtable table with optional filters, sort, and field selection.',
        inputSchema: ListRecordsSchema,
        handler: listRecords,
        agentPermissions: ['ORACLE', 'RELAY', 'STUDIO'],
        estimatedCost: 'Free',
    },
    {
        name: 'airtable_get_record',
        description: 'Get a single Airtable record by ID.',
        inputSchema: GetRecordSchema,
        handler: getRecord,
        agentPermissions: ['ORACLE', 'RELAY', 'STUDIO'],
        estimatedCost: 'Free',
    },
    {
        name: 'airtable_create_record',
        description: 'Create a new record in an Airtable table.',
        inputSchema: CreateRecordSchema,
        handler: createRecord,
        agentPermissions: ['ORACLE', 'STUDIO'],
        estimatedCost: 'Free',
    },
    {
        name: 'airtable_update_record',
        description: 'Partially update (PATCH) an existing Airtable record.',
        inputSchema: UpdateRecordSchema,
        handler: updateRecord,
        agentPermissions: ['ORACLE', 'STUDIO'],
        estimatedCost: 'Free',
    },
    {
        name: 'airtable_delete_record',
        description: 'Delete an Airtable record by ID.',
        inputSchema: DeleteRecordSchema,
        handler: deleteRecord,
        agentPermissions: ['ORACLE'],
        estimatedCost: 'Free',
    },
    {
        name: 'airtable_bulk_create',
        description: 'Create up to 10 Airtable records in a single batch request.',
        inputSchema: BulkCreateSchema,
        handler: bulkCreate,
        agentPermissions: ['ORACLE', 'STUDIO'],
        estimatedCost: 'Free',
    },
    {
        name: 'airtable_list_bases',
        description: 'List all Airtable bases accessible with the API key.',
        inputSchema: ListBasesSchema,
        handler: listBases,
        agentPermissions: ['ORACLE', 'RELAY', 'STUDIO'],
        estimatedCost: 'Free',
    },
    {
        name: 'airtable_list_tables',
        description: 'List all tables in an Airtable base, including their field schemas.',
        inputSchema: ListTablesSchema,
        handler: listTables,
        agentPermissions: ['ORACLE', 'RELAY', 'STUDIO'],
        estimatedCost: 'Free',
    },
];
