export type Themes = "dark" | "light" | "default";

export type ButtonVariant =
    | "PrimeStyle"
    | "BlueSecStyle"
    | "YelSecStyle"
    | "RedSecStyle"
    | "BorderStyle"
    | "PrimeContStyle"
    | "BlueContStyle"
    | "RedContStyle";

// GitHub Issues API Types
export interface GitHubIssue {
    id: number;
    node_id: string;
    number: number;
    title: string;
    body: string | null;
    state: 'open' | 'closed';
    locked: boolean;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    user: {
        id: number;
        login: string;
        avatar_url: string;
        html_url: string;
        type: string;
        site_admin: boolean;
    };
    assignee: {
        id: number;
        login: string;
        avatar_url: string;
        html_url: string;
    } | null;
    assignees: Array<{
        id: number;
        login: string;
        avatar_url: string;
        html_url: string;
    }>;
    labels: Array<{
        id: number;
        node_id: string;
        name: string;
        color: string;
        default: boolean;
        description: string | null;
    }>;
    milestone: {
        id: number;
        title: string;
        description: string | null;
        state: 'open' | 'closed';
        created_at: string;
        updated_at: string;
        due_on: string | null;
    } | null;
    comments: number;
    html_url: string;
    author_association: string;
    reactions: {
        total_count: number;
        '+1': number;
        '-1': number;
        laugh: number;
        hooray: number;
        confused: number;
        heart: number;
        rocket: number;
        eyes: number;
    };
}

// Datatable Configuration Types
export interface ColumnConfig {
    id: string;
    header: string;
    visible: boolean;
    sortable: boolean;
    filterType: 'text' | 'dropdown' | 'date' | 'dateRange';
    options?: string[];
    width?: number;
}

export interface SortConfig {
    id: string;
    desc: boolean;
}

export interface FilterConfig {
    [key: string]: any;
}

export interface PaginationConfig {
    page: number;
    pageSize: number;
    total: number;
}

export interface DataTableState {
    sorting: SortConfig[];
    filters: FilterConfig;
    pagination: PaginationConfig;
    columnVisibility: Record<string, boolean>;
}

// API Response Types
export interface GitHubIssuesResponse {
    data: GitHubIssue[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
}

export interface ApiError {
    message: string;
    status: number;
    retry?: boolean;
}

