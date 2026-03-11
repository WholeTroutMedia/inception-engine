import axios from 'axios';
import { z } from 'zod';

// ─── THE PLUG — Linear MCP Adapter ───────────────────────────────────────────
// Connects Creative Liberation Engine agents to Linear for project management,
// issue tracking, and sprint operations.

const LINEAR_BASE = 'https://api.linear.app/graphql';

const ENV_LINEAR = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };

function linearHeaders() {
    const key = ENV_LINEAR.process?.env?.['LINEAR_API_KEY'];
    if (!key) throw new Error('LINEAR_API_KEY not configured');
    return { 'Authorization': key, 'Content-Type': 'application/json' };
}

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await axios.post<{ data: T; errors?: Array<{ message: string }> }>(
        LINEAR_BASE,
        { query, variables },
        { headers: linearHeaders() }
    );
    if (response.data.errors?.length) {
        throw new Error(`Linear GQL error: ${response.data.errors[0].message}`);
    }
    return response.data.data;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const CreateIssueSchema = z.object({
    title: z.string().describe('Issue title'),
    description: z.string().optional().describe('Issue description in markdown'),
    team_id: z.string().describe('Linear team ID'),
    project_id: z.string().optional().describe('Linear project ID to assign to'),
    priority: z.number().min(0).max(4).default(0).describe('Priority: 0=No, 1=Urgent, 2=High, 3=Medium, 4=Low'),
    label_ids: z.array(z.string()).optional(),
    assignee_id: z.string().optional(),
    estimate: z.number().optional().describe('Story point estimate'),
    due_date: z.string().optional().describe('ISO date string (YYYY-MM-DD)'),
});

export const GetIssuesSchema = z.object({
    team_id: z.string().optional(),
    project_id: z.string().optional(),
    assignee_id: z.string().optional(),
    state: z.enum(['started', 'unstarted', 'completed', 'cancelled', 'backlog']).optional(),
    limit: z.number().min(1).max(50).default(20),
});

export const UpdateIssueSchema = z.object({
    issue_id: z.string().describe('Linear issue ID'),
    title: z.string().optional(),
    description: z.string().optional(),
    state_id: z.string().optional().describe('Workflow state ID to move issue to'),
    priority: z.number().min(0).max(4).optional(),
    assignee_id: z.string().optional(),
    estimate: z.number().optional(),
});

export const GetTeamsSchema = z.object({});
export const GetProjectsSchema = z.object({ team_id: z.string().optional() });

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function createIssue(input: z.infer<typeof CreateIssueSchema>) {
    const v = CreateIssueSchema.parse(input);
    console.log(`[PLUG/LINEAR] 📋 Creating issue: "${v.title}"`);

    const data = await gql<{ issueCreate: { success: boolean; issue: { id: string; identifier: string; url: string } } }>(
        `mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id identifier url title }
      }
    }`,
        {
            input: {
                title: v.title,
                description: v.description,
                teamId: v.team_id,
                projectId: v.project_id,
                priority: v.priority,
                labelIds: v.label_ids,
                assigneeId: v.assignee_id,
                estimate: v.estimate,
                dueDate: v.due_date,
            },
        }
    );

    const issue = data.issueCreate.issue;
    return { id: issue.id, identifier: issue.identifier, url: issue.url };
}

export async function getIssues(input: z.infer<typeof GetIssuesSchema>) {
    const v = GetIssuesSchema.parse(input);

    const filters: string[] = [];
    if (v.team_id) filters.push(`team: { id: { eq: "${v.team_id}" } }`);
    if (v.project_id) filters.push(`project: { id: { eq: "${v.project_id}" } }`);
    if (v.assignee_id) filters.push(`assignee: { id: { eq: "${v.assignee_id}" } }`);
    if (v.state) filters.push(`state: { type: { eq: "${v.state}" } }`);

    const filterStr = filters.length ? `filter: { ${filters.join(' ')} }` : '';

    const data = await gql<{
        issues: {
            nodes: Array<{
                id: string;
                identifier: string;
                title: string;
                priority: number;
                state: { name: string; type: string };
                assignee: { name: string } | null;
                estimate: number | null;
                url: string;
                dueDate: string | null;
            }>
        }
    }>(
        `query GetIssues {
      issues(${filterStr} first: ${v.limit} orderBy: updatedAt) {
        nodes {
          id identifier title priority
          state { name type }
          assignee { name }
          estimate url dueDate
        }
      }
    }`
    );

    return {
        issues: data.issues.nodes.map(i => ({
            id: i.id,
            identifier: i.identifier,
            title: i.title,
            priority: i.priority,
            state: i.state.name,
            state_type: i.state.type,
            assignee: i.assignee?.name ?? 'Unassigned',
            estimate: i.estimate,
            due_date: i.dueDate,
            url: i.url,
        })),
        total: data.issues.nodes.length,
    };
}

export async function updateIssue(input: z.infer<typeof UpdateIssueSchema>) {
    const v = UpdateIssueSchema.parse(input);
    console.log(`[PLUG/LINEAR] ✏️ Updating issue ${v.issue_id}`);

    const data = await gql<{ issueUpdate: { success: boolean; issue: { id: string; identifier: string; url: string } } }>(
        `mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        success
        issue { id identifier url }
      }
    }`,
        {
            id: v.issue_id,
            input: {
                title: v.title,
                description: v.description,
                stateId: v.state_id,
                priority: v.priority,
                assigneeId: v.assignee_id,
                estimate: v.estimate,
            },
        }
    );

    return data.issueUpdate.issue;
}

export async function getTeams() {
    const data = await gql<{
        teams: { nodes: Array<{ id: string; name: string; key: string; memberCount: number }> }
    }>(
        `query { teams { nodes { id name key memberCount } } }`
    );
    return { teams: data.teams.nodes };
}

export async function getProjects(input: z.infer<typeof GetProjectsSchema>) {
    const teamFilter = input.team_id ? `(filter: { team: { id: { eq: "${input.team_id}" } } })` : '';
    const data = await gql<{
        projects: { nodes: Array<{ id: string; name: string; state: string; progress: number; url: string }> }
    }>(
        `query { projects${teamFilter} { nodes { id name state progress url } } }`
    );
    return { projects: data.projects.nodes };
}

// ─── MCP Tool Registration ────────────────────────────────────────────────────

export const LINEAR_MCP_TOOLS = [
    {
        name: 'linear_create_issue',
        description: 'Create a new Linear issue with title, description, priority, assignee, and due date.',
        inputSchema: CreateIssueSchema,
        handler: createIssue,
        agentPermissions: ['ORACLE', 'RELAY', 'STUDIO'],
        estimatedCost: 'Free',
    },
    {
        name: 'linear_get_issues',
        description: 'Get Linear issues filtered by team, project, assignee, or state.',
        inputSchema: GetIssuesSchema,
        handler: getIssues,
        agentPermissions: ['ORACLE', 'RELAY', 'STUDIO'],
        estimatedCost: 'Free',
    },
    {
        name: 'linear_update_issue',
        description: 'Update an existing Linear issue — change title, description, state, priority, or assignee.',
        inputSchema: UpdateIssueSchema,
        handler: updateIssue,
        agentPermissions: ['ORACLE', 'RELAY'],
        estimatedCost: 'Free',
    },
    {
        name: 'linear_get_teams',
        description: 'List all Linear teams the API key has access to.',
        inputSchema: GetTeamsSchema,
        handler: getTeams,
        agentPermissions: ['ORACLE', 'RELAY', 'STUDIO'],
        estimatedCost: 'Free',
    },
    {
        name: 'linear_get_projects',
        description: 'List all Linear projects, optionally filtered by team.',
        inputSchema: GetProjectsSchema,
        handler: getProjects,
        agentPermissions: ['ORACLE', 'RELAY', 'STUDIO'],
        estimatedCost: 'Free',
    },
];
