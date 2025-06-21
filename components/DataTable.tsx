'use client'

import * as React from "react"
import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
    getPaginationRowModel,
    getFilteredRowModel,
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader as TableHeaderComponent,
    TableRow,
} from "./Table"
import { Button } from "./Button"
import { ActionButton } from "./ActionButton"
import { LinkButton } from "./LinkButton"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "./Select"
import { Badge } from "./Badge"
import { Skeleton } from "./Skeleton"
import { SpinLoading } from "./SpinLoading"
import { Avatar, AvatarImage, AvatarFallback } from "./Avatar"
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuCheckboxItem
} from "./DropdownMenu"
import { GitHubIssue, ColumnConfig } from "../utils/types"
import { useGitHubIssues } from "../hooks/useGitHubIssues"
import { format } from 'date-fns'
import {
    RefreshCw,
    Settings,
    MessageCircle,
    AlertTriangle,
    Inbox,
    ChevronFirst,
    ChevronLast,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'
import { InputField } from "./InputField"

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface GitHubIssuesDataTableProps {
    owner: string
    repo: string
    className?: string
    theme?: "dark" | "light" | "default"
}

interface CacheRefs {
    dataCacheRef: React.MutableRefObject<Record<string, GitHubIssue[]>>
    serverPageCacheRef: React.MutableRefObject<Record<string, number>>
    tablePageCacheRef: React.MutableRefObject<Record<string, number>>
    isFetchingMoreRef: React.MutableRefObject<boolean>
    currentTablePageRef: React.MutableRefObject<number>
}

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

/**
 * Default column configuration as per README requirements
 * Defines which columns are visible by default and their properties
 */
const defaultColumns: ColumnConfig[] = [
    {
        id: 'number',
        header: 'Issue #',
        visible: true,
        sortable: false,
        filterType: 'text',
        width: 100
    },
    {
        id: 'title',
        header: 'Issue Title',
        visible: true,
        sortable: true,
        filterType: 'text',
        width: 400
    },
    {
        id: 'state',
        header: 'Status',
        visible: true,
        sortable: false,
        filterType: 'dropdown',
        options: ['open', 'closed', 'all'],
        width: 120
    },
    {
        id: 'user',
        header: 'Author',
        visible: true,
        sortable: false,
        filterType: 'text',
        width: 150
    },
    {
        id: 'labels',
        header: 'Labels',
        visible: true,
        sortable: false,
        filterType: 'text',
        width: 200
    },
    {
        id: 'comments',
        header: 'Comments',
        visible: true,
        sortable: true,
        filterType: 'text',
        width: 100
    },
    {
        id: 'created_at',
        header: 'Created',
        visible: true,
        sortable: true,
        filterType: 'date',
        width: 150
    },
    {
        id: 'updated_at',
        header: 'Updated',
        visible: true,
        sortable: true,
        filterType: 'date',
        width: 150
    }
];

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

/**
 * Hook for managing search input with debouncing
 * Prevents excessive API calls while typing by delaying the search
 * 
 * @param initialValue - Initial search value
 * @param delay - Debounce delay in milliseconds
 * @returns Object with search values and setter
 */
const useSearchDebounce = (initialValue: string = '', delay: number = 500) => {
    const [searchValue, setSearchValue] = useState<string>(initialValue);
    const [debouncedSearchValue, setDebouncedSearchValue] = useState<string>(initialValue);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchValue(searchValue);
        }, delay);

        return () => clearTimeout(timer);
    }, [searchValue, delay]);

    return {
        searchValue,
        debouncedSearchValue,
        setSearchValue
    };
};

/**
 * Hook for managing column visibility with localStorage persistence
 * Saves user preferences for which columns to show/hide
 * 
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns Object with column visibility state and setter
 */
const useColumnVisibility = (owner: string, repo: string) => {
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(`github-issues-columns-${owner}-${repo}`);
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch {
                    // Fall back to default if parsing fails
                }
            }
        }
        return defaultColumns.reduce((acc, col) => ({ ...acc, [col.id]: col.visible }), {});
    });

    // Persist column visibility changes to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(`github-issues-columns-${owner}-${repo}`, JSON.stringify(columnVisibility));
        }
    }, [columnVisibility, owner, repo]);

    return { columnVisibility, setColumnVisibility };
};

/**
 * Hook for managing data caching and server-side pagination
 * Handles caching of fetched data and pagination state for different filter combinations
 * 
 * @returns Object with cache state, refs, and utility functions
 */
const useDataCache = () => {
    // State for UI display
    const [dataCache, setDataCache] = useState<Record<string, GitHubIssue[]>>({});
    const [serverPageCache, setServerPageCache] = useState<Record<string, number>>({});

    // Refs for cache access without triggering re-renders
    const dataCacheRef = useRef<Record<string, GitHubIssue[]>>({});
    const serverPageCacheRef = useRef<Record<string, number>>({});
    const tablePageCacheRef = useRef<Record<string, number>>({});
    const isFetchingMoreRef = useRef<boolean>(false);
    const currentTablePageRef = useRef<number>(0);

    /**
     * Clears all cached data and resets refs
     */
    const clearCache = useCallback(() => {
        dataCacheRef.current = {};
        serverPageCacheRef.current = {};
        tablePageCacheRef.current = {};
        setDataCache({});
        setServerPageCache({});
        currentTablePageRef.current = 0;
    }, []);

    return {
        dataCache,
        serverPageCache,
        setDataCache,
        setServerPageCache,
        dataCacheRef,
        serverPageCacheRef,
        tablePageCacheRef,
        isFetchingMoreRef,
        currentTablePageRef,
        clearCache
    };
};

/**
 * Hook for managing table data accumulation and client-side filtering
 * Handles accumulating server data and applying search filters
 * 
 * @param debouncedSearchValue - Debounced search term
 * @param serverData - Latest data from server
 * @param currentServerPage - Current server page number
 * @param cacheRefs - Cache references object
 * @returns Object with data state and setters
 */
const useTableData = (
    debouncedSearchValue: string,
    serverData: GitHubIssue[] | undefined,
    currentServerPage: number,
    cacheRefs: CacheRefs
) => {
    const [allFetchedData, setAllFetchedData] = useState<GitHubIssue[]>([]);

    // Accumulate fetched data when new server data arrives
    useEffect(() => {
        if (serverData && serverData.length > 0) {
            setAllFetchedData(prevData => {
                if (currentServerPage === 1) {
                    // Page 1: replace all data (new filter or refresh)
                    return serverData;
                } else {
                    // Other pages: append new data (pagination)
                    const existingIds = new Set(prevData.map(item => item.id));
                    const newItems = serverData.filter(item => !existingIds.has(item.id));
                    return [...prevData, ...newItems];
                }
            });
        }
        // Reset the fetching flag when data arrives
        cacheRefs.isFetchingMoreRef.current = false;
    }, [serverData, currentServerPage]);

    // Client-side filtering of the accumulated data
    // Note: State filtering is handled server-side, only search is client-side
    const filteredData = useMemo(() => {
        if (!allFetchedData || allFetchedData.length === 0) return [];

        let filtered = allFetchedData;

        // Apply search filter if search term exists
        if (debouncedSearchValue) {
            const searchTerm = debouncedSearchValue.toLowerCase();
            filtered = filtered.filter((issue: GitHubIssue) =>
                issue.title.toLowerCase().includes(searchTerm) ||
                issue.user.login.toLowerCase().includes(searchTerm) ||
                issue.labels.some((label: any) => label.name.toLowerCase().includes(searchTerm))
            );
        }

        return filtered;
    }, [allFetchedData, debouncedSearchValue]);

    return {
        allFetchedData,
        setAllFetchedData,
        filteredData
    };
};

/**
 * Hook for managing pagination logic and automatic data fetching
 * Determines when to fetch more data based on user's current page position
 * 
 * @param table - React Table instance
 * @param filteredData - Current filtered data
 * @param loading - Loading state
 * @param isFetching - Fetching state
 * @param cacheRefs - Cache references object
 * @param setCurrentServerPage - Function to update server page
 * @returns Object with pagination utilities
 */
const usePaginationLogic = (
    table: any,
    filteredData: GitHubIssue[],
    loading: boolean,
    isFetching: boolean,
    cacheRefs: CacheRefs,
    setCurrentServerPage: React.Dispatch<React.SetStateAction<number>>
) => {
    /**
     * Checks if we need to fetch more data when user navigates near the end
     * Triggers automatic fetching when user reaches the last page and more data might be available
     */
    const checkForMoreData = useCallback(() => {
        // Prevent multiple simultaneous requests
        if (cacheRefs.isFetchingMoreRef.current || loading || isFetching || !table) {
            return;
        }

        const currentPage = table.getState().pagination.pageIndex + 1;
        const totalPages = table.getPageCount();

        // Check if we're on the last page and the current server page might have more data
        const currentDataLength = filteredData.length;
        const itemsInCurrentServerPage = currentDataLength % 100; // Server fetches 100 items per page
        const isLastServerPageFull = itemsInCurrentServerPage === 0 && currentDataLength > 0;

        // Fetch next server page if conditions are met
        if (currentPage >= totalPages - 1 && isLastServerPageFull) {
            // Store current page position before fetching more data
            cacheRefs.currentTablePageRef.current = table.getState().pagination.pageIndex;
            cacheRefs.isFetchingMoreRef.current = true;
            setCurrentServerPage(prev => prev + 1);
        }
    }, [filteredData.length, loading, isFetching, setCurrentServerPage]);

    return { checkForMoreData };
};

// ============================================================================
// TABLE COLUMN DEFINITIONS
// ============================================================================

/**
 * Hook that returns memoized column definitions for the GitHub issues table
 * Defines how each column should be rendered and behave
 * 
 * @returns Array of column definitions
 */
const useTableColumns = (): ColumnDef<GitHubIssue>[] => {
    return useMemo<ColumnDef<GitHubIssue>[]>(() => [
        // Issue number column with link to GitHub
        {
            id: 'number',
            accessorKey: 'number',
            header: 'Issue #',
            enableSorting: false,
            cell: ({ row }) => (
                <LinkButton href={row.original.html_url} size="S">
                    #{row.original.number}
                </LinkButton>
            ),
        },
        // Issue title column with link to GitHub
        {
            id: 'title',
            accessorKey: 'title',
            header: 'Issue Title',
            enableSorting: true,
            cell: ({ row }) => (
                <div className="max-w-md">
                    <LinkButton
                        href={row.original.html_url}
                        size="M"
                        title={row.original.title}
                    >
                        {row.original.title}
                    </LinkButton>
                </div>
            ),
        },
        // Issue state (open/closed) with colored badge
        {
            id: 'state',
            accessorKey: 'state',
            header: 'Status',
            enableSorting: false,
            cell: ({ row }) => (
                <Badge
                    variant={row.original.state === 'open' ? 'green' : 'gray'}
                    label={row.original.state}
                    size="M"
                />
            ),
        },
        // Author column with avatar and username
        {
            id: 'user',
            accessorFn: (row) => row.user.login,
            header: 'Author',
            enableSorting: false,
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage
                            src={row.original.user.avatar_url}
                            alt={`@${row.original.user.login}`}
                        />
                        <AvatarFallback className="text-xs">
                            {row.original.user.login.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{row.original.user.login}</span>
                </div>
            ),
        },
        // Labels column with colored badges (shows max 3, then +count)
        {
            id: 'labels',
            accessorFn: (row) => row.labels.map(l => l.name).join(', '),
            header: 'Labels',
            enableSorting: false,
            cell: ({ row }) => (
                <div className="flex flex-wrap gap-1 max-w-48">
                    {row.original.labels.slice(0, 3).map((label) => (
                        <Badge
                            key={label.id}
                            label={label.name}
                            variant="highlight"
                            size="M"
                            data-theme="dark"
                            style={{ backgroundColor: `#${label.color}` }}
                            className="!space-y-2 [&_div]:text-[#000]"
                        />
                    ))}
                    {row.original.labels.length > 3 && (
                        <Badge
                            variant="gray"
                            label={`+${row.original.labels.length - 3}`}
                            size="M"
                            data-theme="dark"
                            className="!space-y-2 [&_div]:text-[#000]"
                        />
                    )}
                </div>
            ),
        },
        // Comments count with icon
        {
            id: 'comments',
            accessorKey: 'comments',
            header: 'Comments',
            enableSorting: true,
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{row.original.comments}</span>
                </div>
            ),
        },
        // Created date formatted
        {
            id: 'created_at',
            accessorKey: 'created_at',
            header: 'Created',
            enableSorting: true,
            cell: ({ row }) => (
                <span className="text-sm text-gray-600">
                    {format(new Date(row.original.created_at), 'MMM dd, yyyy')}
                </span>
            ),
        },
        // Updated date formatted
        {
            id: 'updated_at',
            accessorKey: 'updated_at',
            header: 'Updated',
            enableSorting: true,
            cell: ({ row }) => (
                <span className="text-sm text-gray-600">
                    {format(new Date(row.original.updated_at), 'MMM dd, yyyy')}
                </span>
            ),
        },
    ], []);
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Loading skeleton component for table rows
 * Shows placeholder content while data is being fetched
 */
const LoadingSkeleton = ({ columns }: { columns: ColumnDef<GitHubIssue>[] }) => (
    <div className="space-y-2 p-4">
        {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="flex space-x-4">
                {columns.map((_, j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                ))}
            </div>
        ))}
    </div>
);

/**
 * Error state component
 * Displays error message with retry button
 */
interface ErrorStateProps {
    error: any;
    onRetry: () => void;
}

const ErrorState = ({ error, onRetry }: ErrorStateProps) => (
    <div className="text-center py-8 flex flex-col items-center justify-center">
        <div className="text-red-600 mb-4">
            <AlertTriangle className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Issues</h3>
        <p className="text-gray-600 mb-4">{error?.message}</p>
        <Button onClick={onRetry} variant="BorderStyle">
            Try Again
        </Button>
    </div>
);

/**
 * Empty state component when no data is found
 * Shows when filters result in no matching issues
 */
const EmptyState = () => (
    <div className="text-center py-8 flex flex-col items-center justify-center">
        <div className="text-gray-400 mb-4">
            <Inbox className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Issues Found</h3>
        <p className="text-gray-600">Try adjusting your filters or search criteria.</p>
    </div>
);

/**
 * Table header with repository info and action controls
 * Contains refresh button, cache controls, and column visibility toggle
 */
interface TableHeaderProps {
    owner: string;
    repo: string;
    totalItems: number;
    currentServerPage: number;
    isFetching: boolean;
    isRefetching: boolean;
    cacheCount: number;
    onRefresh: () => void;
    onClearCache: () => void;
    columnVisibility: Record<string, boolean>;
    onColumnVisibilityChange: (visibility: Record<string, boolean>) => void;
    loading: boolean;
}

const TableHeader = ({
    owner,
    repo,
    totalItems,
    currentServerPage,
    isFetching,
    isRefetching,
    cacheCount,
    onRefresh,
    onClearCache,
    columnVisibility,
    onColumnVisibilityChange,
    loading
}: TableHeaderProps) => (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="typography-headers-medium-medium text-content-presentation-global-primary">
                {owner}/{repo} Issues
            </h2>
            <p className="typography-body-small-medium flex items-center gap-2 text-content-presentation-global-secondary">
                {totalItems} total issues
                {/* Show current server page if more than 1 page loaded */}
                {currentServerPage > 1 && (
                    <span className="text-xs text-gray-400">
                        (Page {currentServerPage} loaded)
                    </span>
                )}
                {/* Show loading spinner when fetching */}
                {(isFetching || isRefetching) && (
                    <SpinLoading className="w-6 h-6" />
                )}
                {/* Show cache status */}
                {cacheCount > 1 && (
                    <span className="text-xs text-blue-500">
                        • {cacheCount} filter combinations cached
                    </span>
                )}
            </p>
        </div>

        <div className="flex items-center gap-2">
            {/* Refresh button */}
            <Button
                onClick={onRefresh}
                disabled={loading || isFetching}
                size="XL"
            >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
            </Button>

            {/* Clear cache button (only show if cache exists) */}
            {cacheCount > 1 && (
                <Button
                    onClick={onClearCache}
                    variant="BorderStyle"
                    size="XL"
                    title="Clear all cached data"
                >
                    Clear Cache
                </Button>
            )}

            {/* Column visibility toggle */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="XL">
                        <Settings className="w-4 h-4 mr-2" />
                        Columns
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="z-[1000]">
                    {defaultColumns.map((column) => (
                        <DropdownMenuCheckboxItem
                            key={column.id}
                            checked={columnVisibility[column.id]}
                            onCheckedChange={(checked: boolean) =>
                                onColumnVisibilityChange({ ...columnVisibility, [column.id]: checked })
                            }
                        >
                            {column.header}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </div>
);

/**
 * Filter controls component
 * Contains search input, state filter, and page size selector
 */
interface FilterControlsProps {
    searchValue: string;
    onSearchChange: (value: string) => void;
    stateFilter: string;
    onStateFilterChange: (value: string) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
}

const FilterControls = ({
    searchValue,
    onSearchChange,
    stateFilter,
    onStateFilterChange,
    pageSize,
    onPageSizeChange
}: FilterControlsProps) => (
    <div className="flex gap-4">
        {/* Search input */}
        <InputField
            placeholder="Search issues..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
        />

        {/* State filter dropdown */}
        <Select value={stateFilter} onValueChange={onStateFilterChange}>
            <SelectTrigger size="XL">
                <SelectValue placeholder="Select state..." />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
        </Select>

        {/* Page size selector */}
        <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange(parseInt(value))}
        >
            <SelectTrigger size="XL">
                <SelectValue placeholder="Page size..." />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
            </SelectContent>
        </Select>
    </div>
);

/**
 * Pagination controls component
 * Contains navigation buttons and page information
 */
interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    table: any;
    onPageChange: (page: number) => void;
    onCheckForMoreData: () => void;
    isFetching: boolean;
}

const PaginationControls = ({
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    table,
    onPageChange,
    onCheckForMoreData,
    isFetching
}: PaginationControlsProps) => (
    <div className="flex items-center justify-between">
        {/* Page information */}
        <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * pageSize) + 1} to{' '}
            {Math.min(currentPage * pageSize, totalItems)} of{' '}
            {totalItems} results
            {totalPages > 1 && (
                <span className="ml-2 text-gray-400">
                    • Page {currentPage} of {totalPages}
                </span>
            )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
            {/* First page shortcut (only show if far from start) */}
            {currentPage > 5 && (
                <ActionButton
                    variant="BorderStyle"
                    onClick={() => onPageChange(1)}
                    disabled={isFetching}
                    size="M"
                    title="Back to first page"
                >
                    <span className="text-xs font-medium">First</span>
                </ActionButton>
            )}

            {/* First page button */}
            <ActionButton
                variant="BorderStyle"
                onClick={() => onPageChange(1)}
                disabled={!table.getCanPreviousPage() || isFetching}
                size="M"
            >
                <ChevronFirst className="w-4 h-4" />
            </ActionButton>

            {/* Previous page button */}
            <ActionButton
                variant="BorderStyle"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage() || isFetching}
                size="M"
            >
                <ChevronLeft className="w-4 h-4" />
            </ActionButton>

            {/* Current page indicator */}
            <span className="px-4 py-2 text-sm text-content-presentation-global-secondary">
                Page {currentPage} of {totalPages}
            </span>

            {/* Next page button with auto-fetch */}
            <ActionButton
                variant="BorderStyle"
                onClick={() => {
                    table.nextPage();
                    // Check for more data after a short delay
                    setTimeout(onCheckForMoreData, 100);
                }}
                disabled={!table.getCanNextPage() || isFetching}
                size="M"
            >
                <ChevronRight className="w-4 h-4" />
            </ActionButton>

            {/* Last page button */}
            <ActionButton
                variant="BorderStyle"
                onClick={() => onPageChange(totalPages)}
                disabled={!table.getCanNextPage() || isFetching}
                size="M"
            >
                <ChevronLast className="w-4 h-4" />
            </ActionButton>
        </div>
    </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * GitHub Issues DataTable Component
 * 
 * A comprehensive data table for displaying GitHub issues with advanced features:
 * - Server-side pagination and state filtering
 * - Client-side search and caching
 * - Column visibility controls with localStorage persistence
 * - Intelligent data fetching and page position preservation
 * - Responsive design with loading states and error handling
 * 
 * @param owner - GitHub repository owner
 * @param repo - GitHub repository name
 * @param className - Optional CSS class name
 * @param theme - Table theme (dark/light/default)
 */
export function GitHubIssuesDataTable({
    owner,
    repo,
    className,
    theme = "default"
}: GitHubIssuesDataTableProps) {
    // ========================================================================
    // STATE & HOOKS INITIALIZATION
    // ========================================================================

    // Core state management
    const [stateFilter, setStateFilter] = useState<string>('all');
    const [currentServerPage, setCurrentServerPage] = useState<number>(1);

    // Custom hooks for specific functionality
    const { searchValue, debouncedSearchValue, setSearchValue } = useSearchDebounce();
    const { columnVisibility, setColumnVisibility } = useColumnVisibility(owner, repo);
    const cacheHook = useDataCache();
    const columns = useTableColumns();

    // ========================================================================
    // DATA FETCHING & SERVER COMMUNICATION
    // ========================================================================

    // Server-side pagination parameters
    const serverHookParams = useMemo(() => ({
        owner,
        repo,
        sorting: [],
        filters: { state: stateFilter }, // State filtering handled server-side
        pagination: { page: currentServerPage, pageSize: 100, total: 0 },
        enabled: true
    }), [owner, repo, stateFilter, currentServerPage]);

    // Data fetching with TanStack Query hook
    const { data: serverData, loading, error, refetch, isRefetching, isFetching } = useGitHubIssues(serverHookParams);

    // ========================================================================
    // DATA PROCESSING & CACHING LOGIC
    // ========================================================================

    // Cache management for different filter combinations
    const filterKey = `${stateFilter}-${debouncedSearchValue}`;

    // Table data management with caching
    const { allFetchedData, setAllFetchedData, filteredData } = useTableData(
        debouncedSearchValue,
        serverData,
        currentServerPage,
        {
            dataCacheRef: cacheHook.dataCacheRef,
            serverPageCacheRef: cacheHook.serverPageCacheRef,
            tablePageCacheRef: cacheHook.tablePageCacheRef,
            isFetchingMoreRef: cacheHook.isFetchingMoreRef,
            currentTablePageRef: cacheHook.currentTablePageRef
        }
    );

    // ========================================================================
    // CACHE MANAGEMENT EFFECTS
    // ========================================================================

    // Update cache refs when data changes
    useEffect(() => {
        if (allFetchedData.length > 0) {
            // Update all cache refs with current data
            cacheHook.dataCacheRef.current = {
                ...cacheHook.dataCacheRef.current,
                [filterKey]: allFetchedData
            };
            cacheHook.serverPageCacheRef.current = {
                ...cacheHook.serverPageCacheRef.current,
                [filterKey]: currentServerPage
            };
            cacheHook.tablePageCacheRef.current = {
                ...cacheHook.tablePageCacheRef.current,
                [filterKey]: cacheHook.currentTablePageRef.current
            };

            // Update state for UI display
            cacheHook.setDataCache({ ...cacheHook.dataCacheRef.current });
            cacheHook.setServerPageCache({ ...cacheHook.serverPageCacheRef.current });
        }
    }, [allFetchedData.length, filterKey, currentServerPage]);

    // Handle filter changes - restore from cache or reset
    useEffect(() => {
        const cachedData = cacheHook.dataCacheRef.current[filterKey];
        const cachedServerPage = cacheHook.serverPageCacheRef.current[filterKey];
        const cachedTablePage = cacheHook.tablePageCacheRef.current[filterKey];

        // Reset fetching flag when filters change
        cacheHook.isFetchingMoreRef.current = false;

        if (cachedData && cachedData.length > 0) {
            // Restore from cache if data exists for this filter combination
            setAllFetchedData(cachedData);
            setCurrentServerPage(cachedServerPage || 1);
            cacheHook.currentTablePageRef.current = cachedTablePage || 0;
        } else {
            // New filter combination, start fresh
            setCurrentServerPage(1);
            setAllFetchedData([]);
            cacheHook.currentTablePageRef.current = 0;
        }
    }, [filterKey]);

    // ========================================================================
    // TABLE CONFIGURATION & SETUP
    // ========================================================================

    // Memoize table state to prevent unnecessary re-renders
    const tableState = useMemo(() => ({
        columnVisibility,
        globalFilter: searchValue, // Use immediate search value for responsive UI
    }), [columnVisibility, searchValue]);

    // Memoize static table configuration
    const staticTableConfig = useMemo(() => ({
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        enableColumnResizing: false,
        enableSorting: true,
        enableFilters: true, // Enable client-side filtering for search
        enableGlobalFilter: true, // Enable global filter for search
        initialState: {
            pagination: { pageSize: 25 }, // Default page size
            sorting: [{ id: 'created_at', desc: true }], // Default sort by newest
        },
    }), []);

    // Memoize table options to prevent unnecessary re-renders
    const tableOptions = useMemo(() => ({
        data: filteredData || [],
        columns,
        ...staticTableConfig,
        state: tableState,
        onColumnVisibilityChange: setColumnVisibility,
        onGlobalFilterChange: setSearchValue,
    }), [filteredData, columns, staticTableConfig, tableState, setColumnVisibility, setSearchValue]);

    // Create React Table instance
    const table = useReactTable(tableOptions);

    // Use a ref to track the table instance for useEffect hooks
    const tableRef = useRef(table);
    tableRef.current = table;

    // ========================================================================
    // PAGINATION & DATA FETCHING LOGIC
    // ========================================================================

    const { checkForMoreData } = usePaginationLogic(
        table,
        filteredData,
        loading,
        isFetching,
        {
            dataCacheRef: cacheHook.dataCacheRef,
            serverPageCacheRef: cacheHook.serverPageCacheRef,
            tablePageCacheRef: cacheHook.tablePageCacheRef,
            isFetchingMoreRef: cacheHook.isFetchingMoreRef,
            currentTablePageRef: cacheHook.currentTablePageRef
        },
        setCurrentServerPage
    );

    // Store current page position before data changes
    useEffect(() => {
        if (tableRef.current && !cacheHook.isFetchingMoreRef.current) {
            cacheHook.currentTablePageRef.current = tableRef.current.getState().pagination.pageIndex;
        }
    }, [filteredData.length]);

    // Restore page position after new data is loaded (when fetching more data)
    useEffect(() => {
        if (tableRef.current && allFetchedData.length > 0 && currentServerPage > 1 && cacheHook.isFetchingMoreRef.current === false) {
            const savedPage = cacheHook.currentTablePageRef.current;
            const totalPages = tableRef.current.getPageCount();

            // Restore the saved page if it's still valid
            if (savedPage > 0 && savedPage < totalPages) {
                setTimeout(() => {
                    tableRef.current?.setPageIndex(savedPage);
                }, 50); // Small delay to ensure table has updated
            }
        }
    }, [allFetchedData.length, currentServerPage]);

    // Restore cached table page position when switching filters
    useEffect(() => {
        if (tableRef.current && allFetchedData.length > 0) {
            const cachedTablePage = cacheHook.tablePageCacheRef.current[filterKey];
            if (cachedTablePage && cachedTablePage > 0) {
                setTimeout(() => {
                    const totalPages = tableRef.current?.getPageCount() || 0;
                    if (cachedTablePage < totalPages) {
                        tableRef.current?.setPageIndex(cachedTablePage);
                    }
                }, 100); // Longer delay for filter switches
            }
        }
    }, [allFetchedData.length, filterKey]);

    // Reset pagination when filters change (but not when fetching more data)
    useEffect(() => {
        if (tableRef.current && !cacheHook.dataCacheRef.current[filterKey]) {
            // Only reset if there's no cached data for this filter
            tableRef.current.setPageIndex(0);
            cacheHook.currentTablePageRef.current = 0;
        }
    }, [stateFilter, debouncedSearchValue, filterKey]);

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    const handleSearchChange = useCallback((value: string) => {
        setSearchValue(value);
    }, [setSearchValue]);

    const handleStateFilterChange = useCallback((value: string) => {
        setStateFilter(value);
    }, []);

    const handlePageSizeChange = useCallback((newPageSize: number) => {
        table.setPageSize(newPageSize);
        table.setPageIndex(0); // Reset to first page when page size changes
    }, []);

    const handlePageChange = useCallback((newPage: number) => {
        const totalPages = table.getPageCount();
        if (newPage >= 1 && newPage <= totalPages && totalPages > 0) {
            table.setPageIndex(newPage - 1);
            // Check if we need to fetch more data after page change
            setTimeout(checkForMoreData, 100);
        }
    }, [checkForMoreData]);

    const handleClearCache = useCallback(() => {
        cacheHook.clearCache();
        setCurrentServerPage(1);
        setAllFetchedData([]);
        refetch();
    }, [refetch]);

    // ========================================================================
    // COMPUTED VALUES FOR RENDER
    // ========================================================================

    const totalPages = filteredData && filteredData.length > 0 ? table.getPageCount() : 0;
    const currentPage = filteredData && filteredData.length > 0 ? table.getState().pagination.pageIndex + 1 : 1;
    const pageSize = table.getState().pagination.pageSize;
    const totalItems = filteredData ? filteredData.length : 0;

    // ========================================================================
    // COMPONENT RENDER
    // ========================================================================

    return (
        <div className={`space-y-4 ${className || ''}`}>
            {/* Header with repository info and controls */}
            <TableHeader
                owner={owner}
                repo={repo}
                totalItems={totalItems}
                currentServerPage={currentServerPage}
                isFetching={isFetching}
                isRefetching={isRefetching}
                cacheCount={Object.keys(cacheHook.dataCache).length}
                onRefresh={refetch}
                onClearCache={handleClearCache}
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={setColumnVisibility}
                loading={loading}
            />

            {/* Filter controls */}
            <FilterControls
                searchValue={searchValue}
                onSearchChange={handleSearchChange}
                stateFilter={stateFilter}
                onStateFilterChange={handleStateFilterChange}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
            />

            {/* Table container with conditional content */}
            <div className="border border-border-presentation-action-borderstyle rounded-lg overflow-x-auto">
                {/* Loading state */}
                {loading && <LoadingSkeleton columns={columns} />}

                {/* Error state */}
                {error && <ErrorState error={error} onRetry={refetch} />}

                {/* Empty state */}
                {!loading && !error && filteredData.length === 0 && <EmptyState />}

                {/* Data table */}
                {!loading && !error && filteredData.length > 0 && (
                    <Table theme={theme}>
                        <TableHeaderComponent>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        const column = defaultColumns.find(col => col.id === header.id);
                                        const sortDirection = header.column.getIsSorted();

                                        return (
                                            <TableHead
                                                key={header.id}
                                                sortType={sortDirection === 'desc' ? 'desc' : sortDirection === 'asc' ? 'asc' : undefined}
                                                onSort={header.column.getCanSort() ? () => header.column.toggleSorting() : undefined}
                                                style={{ minWidth: column?.width }}
                                            >
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(header.column.columnDef.header, header.getContext())
                                                }
                                            </TableHead>
                                        );
                                    })}
                                    <TableHead className="w-full"></TableHead>
                                </TableRow>
                            ))}
                        </TableHeaderComponent>
                        <TableBody>
                            {table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                    <TableCell className="w-full"></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Pagination controls */}
            {!loading && !error && filteredData.length > 0 && (
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalItems={totalItems}
                    table={table}
                    onPageChange={handlePageChange}
                    onCheckForMoreData={checkForMoreData}
                    isFetching={isFetching}
                />
            )}
        </div>
    );
}
