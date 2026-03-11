import axios from 'axios';
import { z } from 'zod';

// ─── THE PLUG — Google Sheets MCP Adapter ────────────────────────────────────

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const ENV_GS = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };
const getEnv = (k: string) => ENV_GS.process?.env?.[k];

function sheetsHeaders() {
    const token = getEnv('GOOGLE_ACCESS_TOKEN');
    if (!token) throw new Error('GOOGLE_ACCESS_TOKEN required for Google Sheets');
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const ReadRangeSchema = z.object({
    spreadsheet_id: z.string(),
    range: z.string().describe('A1 notation, e.g. "Sheet1!A1:D10" or named range'),
    major_dimension: z.enum(['ROWS', 'COLUMNS']).default('ROWS'),
    value_render: z.enum(['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA']).default('FORMATTED_VALUE'),
});

export const ReadMultipleRangesSchema = z.object({
    spreadsheet_id: z.string(),
    ranges: z.array(z.string()).min(1).max(20),
    major_dimension: z.enum(['ROWS', 'COLUMNS']).default('ROWS'),
});

export const WriteRangeSchema = z.object({
    spreadsheet_id: z.string(),
    range: z.string(),
    values: z.array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))).describe('Row-major 2D array of values'),
    value_input: z.enum(['RAW', 'USER_ENTERED']).default('USER_ENTERED').describe('USER_ENTERED parses formulas; RAW treats everything as strings'),
});

export const AppendRowsSchema = z.object({
    spreadsheet_id: z.string(),
    range: z.string().describe('Sheet name or range to append after, e.g. "Sheet1"'),
    values: z.array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))),
    value_input: z.enum(['RAW', 'USER_ENTERED']).default('USER_ENTERED'),
});

export const ClearRangeSchema = z.object({
    spreadsheet_id: z.string(),
    range: z.string(),
});

export const GetSpreadsheetSchema = z.object({
    spreadsheet_id: z.string(),
    include_grid_data: z.boolean().default(false),
});

export const CreateSpreadsheetSchema = z.object({
    title: z.string(),
    sheets: z.array(z.object({ title: z.string() })).default([{ title: 'Sheet1' }]),
});

export const AddSheetSchema = z.object({
    spreadsheet_id: z.string(),
    sheet_title: z.string(),
    rows: z.number().default(1000),
    cols: z.number().default(26),
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

interface ValueRange { range: string; majorDimension: string; values?: Array<Array<string | number | boolean | null>> }

export async function readRange(input: z.infer<typeof ReadRangeSchema>) {
    const v = ReadRangeSchema.parse(input);
    const res = await axios.get<ValueRange>(`${SHEETS_BASE}/${v.spreadsheet_id}/values/${encodeURIComponent(v.range)}`, {
        headers: sheetsHeaders(),
        params: { majorDimension: v.major_dimension, valueRenderOption: v.value_render },
    });
    return { range: res.data.range, values: res.data.values ?? [], row_count: res.data.values?.length ?? 0 };
}

export async function readMultipleRanges(input: z.infer<typeof ReadMultipleRangesSchema>) {
    const v = ReadMultipleRangesSchema.parse(input);
    const res = await axios.get<{ valueRanges: ValueRange[] }>(`${SHEETS_BASE}/${v.spreadsheet_id}/values:batchGet`, {
        headers: sheetsHeaders(),
        params: { ranges: v.ranges, majorDimension: v.major_dimension },
    });
    return {
        ranges: res.data.valueRanges.map(r => ({ range: r.range, values: r.values ?? [], row_count: r.values?.length ?? 0 })),
    };
}

export async function writeRange(input: z.infer<typeof WriteRangeSchema>) {
    const v = WriteRangeSchema.parse(input);
    const res = await axios.put<{ updatedRange: string; updatedRows: number; updatedColumns: number; updatedCells: number }>(
        `${SHEETS_BASE}/${v.spreadsheet_id}/values/${encodeURIComponent(v.range)}`,
        { range: v.range, majorDimension: 'ROWS', values: v.values },
        { headers: sheetsHeaders(), params: { valueInputOption: v.value_input } }
    );
    return { updated_range: res.data.updatedRange, updated_rows: res.data.updatedRows, updated_cells: res.data.updatedCells };
}

export async function appendRows(input: z.infer<typeof AppendRowsSchema>) {
    const v = AppendRowsSchema.parse(input);
    const res = await axios.post<{ updates: { updatedRange: string; updatedRows: number } }>(
        `${SHEETS_BASE}/${v.spreadsheet_id}/values/${encodeURIComponent(v.range)}:append`,
        { majorDimension: 'ROWS', values: v.values },
        { headers: sheetsHeaders(), params: { valueInputOption: v.value_input, insertDataOption: 'INSERT_ROWS' } }
    );
    return { appended_to: res.data.updates.updatedRange, rows_appended: res.data.updates.updatedRows };
}

export async function clearRange(input: z.infer<typeof ClearRangeSchema>) {
    const v = ClearRangeSchema.parse(input);
    const res = await axios.post<{ clearedRange: string }>(
        `${SHEETS_BASE}/${v.spreadsheet_id}/values/${encodeURIComponent(v.range)}:clear`,
        {},
        { headers: sheetsHeaders() }
    );
    return { cleared_range: res.data.clearedRange };
}

export async function getSpreadsheet(input: z.infer<typeof GetSpreadsheetSchema>) {
    const v = GetSpreadsheetSchema.parse(input);
    const res = await axios.get<{ spreadsheetId: string; properties: { title: string }; sheets: Array<{ properties: { sheetId: number; title: string; index: number; rowCount?: number; columnCount?: number } }> }>(
        `${SHEETS_BASE}/${v.spreadsheet_id}`,
        { headers: sheetsHeaders(), params: { includeGridData: v.include_grid_data } }
    );
    return {
        spreadsheet_id: res.data.spreadsheetId,
        title: res.data.properties.title,
        sheets: res.data.sheets.map(s => ({ id: s.properties.sheetId, title: s.properties.title, index: s.properties.index })),
    };
}

export async function createSpreadsheet(input: z.infer<typeof CreateSpreadsheetSchema>) {
    const v = CreateSpreadsheetSchema.parse(input);
    const res = await axios.post<{ spreadsheetId: string; spreadsheetUrl: string }>(
        SHEETS_BASE,
        { properties: { title: v.title }, sheets: v.sheets.map(s => ({ properties: { title: s.title } })) },
        { headers: sheetsHeaders() }
    );
    return { spreadsheet_id: res.data.spreadsheetId, url: res.data.spreadsheetUrl, title: v.title };
}

export async function addSheet(input: z.infer<typeof AddSheetSchema>) {
    const v = AddSheetSchema.parse(input);
    const res = await axios.post<{ replies: Array<{ addSheet?: { properties: { sheetId: number; title: string } } }> }>(
        `${SHEETS_BASE}/${v.spreadsheet_id}:batchUpdate`,
        { requests: [{ addSheet: { properties: { title: v.sheet_title, gridProperties: { rowCount: v.rows, columnCount: v.cols } } } }] },
        { headers: sheetsHeaders() }
    );
    const sheet = res.data.replies[0]?.addSheet?.properties;
    return { sheet_id: sheet?.sheetId, title: sheet?.title };
}

// ─── MCP Tool Registration ────────────────────────────────────────────────────

export const SHEETS_TOOLS = [
    { name: 'sheets_read_range', description: 'Read a range of cells from a Google Sheets spreadsheet.', inputSchema: ReadRangeSchema, handler: readRange, agentPermissions: ['ORACLE', 'RELAY', 'SCRIBE'], estimatedCost: 'Free' },
    { name: 'sheets_read_multiple_ranges', description: 'Read multiple cell ranges in a single API call.', inputSchema: ReadMultipleRangesSchema, handler: readMultipleRanges, agentPermissions: ['ORACLE', 'RELAY'], estimatedCost: 'Free' },
    { name: 'sheets_write_range', description: 'Write values to a specific range in a Google Sheet.', inputSchema: WriteRangeSchema, handler: writeRange, agentPermissions: ['ORACLE', 'SCRIBE', 'ZERO_DAY'], estimatedCost: 'Free' },
    { name: 'sheets_append_rows', description: 'Append new rows to a Google Sheet.', inputSchema: AppendRowsSchema, handler: appendRows, agentPermissions: ['ORACLE', 'SCRIBE', 'ZERO_DAY'], estimatedCost: 'Free' },
    { name: 'sheets_clear_range', description: 'Clear values from a range in a Google Sheet.', inputSchema: ClearRangeSchema, handler: clearRange, agentPermissions: ['ORACLE', 'SCRIBE'], estimatedCost: 'Free' },
    { name: 'sheets_get_spreadsheet', description: 'Get metadata about a spreadsheet including its sheets list.', inputSchema: GetSpreadsheetSchema, handler: getSpreadsheet, agentPermissions: ['ORACLE', 'RELAY'], estimatedCost: 'Free' },
    { name: 'sheets_create_spreadsheet', description: 'Create a new Google Sheets spreadsheet.', inputSchema: CreateSpreadsheetSchema, handler: createSpreadsheet, agentPermissions: ['ORACLE', 'SCRIBE', 'ZERO_DAY'], estimatedCost: 'Free' },
    { name: 'sheets_add_sheet', description: 'Add a new sheet tab to an existing spreadsheet.', inputSchema: AddSheetSchema, handler: addSheet, agentPermissions: ['ORACLE', 'SCRIBE'], estimatedCost: 'Free' },
];
