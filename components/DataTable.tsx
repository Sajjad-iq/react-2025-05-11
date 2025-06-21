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
    TableHeader,
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


interface GitHubIssuesDataTableProps {
    owner: string
    repo: string
    className?: string
    theme?: "dark" | "light" | "default"
}

// Default column configuration as per README requirements
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
        id: 'assignees',
        header: 'Assignees',
        visible: true,
        sortable: false,
        filterType: 'text',
        width: 150
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


// GitHub Issues DataTable Component
export function GitHubIssuesDataTable({ owner, repo, className, theme = "default" }: GitHubIssuesDataTableProps) {
    // Simple state for non-table functionality
    const [stateFilter, setStateFilter] = useState<string>('all');
    const [searchValue, setSearchValue] = useState<string>('');
    const [debouncedSearchValue, setDebouncedSearchValue] = useState<string>('');
    const [currentServerPage, setCurrentServerPage] = useState<number>(1);
    const [allFetchedData, setAllFetchedData] = useState<GitHubIssue[]>([]);
    const [dataCache, setDataCache] = useState<Record<string, GitHubIssue[]>>({});
    const [serverPageCache, setServerPageCache] = useState<Record<string, number>>({});
    const dataCacheRef = useRef<Record<string, GitHubIssue[]>>({});
    const serverPageCacheRef = useRef<Record<string, number>>({});
    const isFetchingMoreRef = useRef<boolean>(false);

    // Debounce search input to prevent excessive API calls
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchValue(searchValue);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchValue]);

    // Column visibility state
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(`github-issues-columns-${owner}-${repo}`);
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch {
                    // Fall back to default
                }
            }
        }
        return defaultColumns.reduce((acc, col) => ({ ...acc, [col.id]: col.visible }), {});
    });

    // Persist column visibility
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(`github-issues-columns-${owner}-${repo}`, JSON.stringify(columnVisibility));
        }
    }, [columnVisibility, owner, repo]);

    // Server-side pagination parameters
    const serverHookParams = useMemo(() => ({
        owner,
        repo,
        sorting: [],
        filters: { state: stateFilter }, // Use current state filter
        pagination: { page: currentServerPage, pageSize: 100, total: 0 },
        enabled: true
    }), [owner, repo, stateFilter, currentServerPage]);

    // Data fetching with TanStack Query hook - fetch data by server page
    const { data: serverData, loading, error, refetch, isRefetching, isFetching } = useGitHubIssues(serverHookParams);

    // Cache management for different filter combinations
    const filterKey = `${stateFilter}-${debouncedSearchValue}`;

    // Accumulate fetched data when new server data arrives
    useEffect(() => {
        if (serverData && serverData.length > 0) {
            setAllFetchedData(prevData => {
                if (currentServerPage === 1) {
                    // Page 1: replace all data
                    return serverData;
                } else {
                    // Other pages: append new data
                    const existingIds = new Set(prevData.map(item => item.id));
                    const newItems = serverData.filter(item => !existingIds.has(item.id));
                    return [...prevData, ...newItems];
                }
            });
        }
        // Reset the fetching flag when data arrives
        isFetchingMoreRef.current = false;
    }, [serverData, currentServerPage]); // Removed allFetchedData dependency

    // Update cache refs when data changes
    useEffect(() => {
        if (allFetchedData.length > 0) {
            dataCacheRef.current = {
                ...dataCacheRef.current,
                [filterKey]: allFetchedData
            };
            serverPageCacheRef.current = {
                ...serverPageCacheRef.current,
                [filterKey]: currentServerPage
            };

            // Update state for UI display only (batched to prevent multiple re-renders)
            setDataCache({ ...dataCacheRef.current });
            setServerPageCache({ ...serverPageCacheRef.current });
        }
    }, [allFetchedData, filterKey, currentServerPage]);

    // Handle filter changes - restore from cache or reset
    useEffect(() => {
        const cachedData = dataCacheRef.current[filterKey];
        const cachedPage = serverPageCacheRef.current[filterKey];

        // Reset fetching flag when filters change
        isFetchingMoreRef.current = false;

        if (cachedData && cachedData.length > 0) {
            // Restore from cache
            setAllFetchedData(cachedData);
            setCurrentServerPage(cachedPage || 1);
        } else {
            // New filter combination, start fresh
            setCurrentServerPage(1);
            setAllFetchedData([]);
        }
    }, [filterKey]); // Only depend on filterKey

    // Client-side filtering of the accumulated data (only for search, state is handled server-side)
    const filteredData = useMemo(() => {
        if (!allFetchedData || allFetchedData.length === 0) return [];

        let filtered = allFetchedData;

        // Filter by search term (state filtering is now handled server-side)
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

    // Memoized column definitions for performance
    const columns = useMemo<ColumnDef<GitHubIssue>[]>(() => [
        {
            id: 'number',
            accessorKey: 'number',
            header: 'Issue #',
            enableSorting: false,
            cell: ({ row }) => (
                <LinkButton
                    href={row.original.html_url}
                    size="S"
                >
                    #{row.original.number}
                </LinkButton>
            ),
        },
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
        {
            id: 'user',
            accessorFn: (row) => row.user.login,
            header: 'Author',
            enableSorting: false,
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <img
                        src={row.original.user.avatar_url}
                        alt={row.original.user.login}
                        className="w-6 h-6 rounded-full"
                    />
                    <span className="text-sm">{row.original.user.login}</span>
                </div>
            ),
        },
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

    // Memoize table state to prevent unnecessary re-renders
    const tableState = useMemo(() => ({
        columnVisibility,
        globalFilter: searchValue, // Use immediate search value for responsive UI
    }), [columnVisibility, searchValue]);

    // Memoize static table configuration to prevent re-creation
    const staticTableConfig = useMemo(() => ({
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        enableColumnResizing: false,
        enableSorting: true,
        enableFilters: true, // Enable client-side filtering for local data
        enableGlobalFilter: true, // Enable global filter for local search
        initialState: {
            pagination: {
                pageSize: 25,
            },
            sorting: [{ id: 'created_at', desc: true }],
        },
    }), []);

    // Memoize table options to prevent unnecessary re-renders
    const tableOptions = useMemo(() => ({
        data: filteredData || [], // Use filtered data
        columns,
        ...staticTableConfig,
        state: tableState,
        onColumnVisibilityChange: setColumnVisibility,
        onGlobalFilterChange: setSearchValue,
    }), [filteredData, columns, staticTableConfig, tableState]);

    // React Table instance with client-side operations
    const table = useReactTable(tableOptions);

    // Reset pagination when filters change
    useEffect(() => {
        table.setPageIndex(0);
    }, [stateFilter, debouncedSearchValue]);

    // Check if we need to fetch more data when user navigates to near the end
    const checkForMoreData = useCallback(() => {
        // Prevent multiple simultaneous requests
        if (isFetchingMoreRef.current || loading || isFetching) {
            return;
        }

        const currentPage = table.getState().pagination.pageIndex + 1;
        const totalPages = table.getPageCount();

        // If we're on the last page and have exactly 100 items per server page,
        // there might be more data to fetch
        const currentDataLength = filteredData.length;
        const itemsInCurrentServerPage = currentDataLength % 100;
        const isLastServerPageFull = itemsInCurrentServerPage === 0 && currentDataLength > 0;

        // Fetch next server page if we're near the end and the last page was full
        if (currentPage >= totalPages - 1 && isLastServerPageFull) {
            isFetchingMoreRef.current = true;
            setCurrentServerPage(prev => prev + 1);
        }
    }, [table, filteredData.length, loading, isFetching]);

    // Event handlers with proper dependencies
    const handleSearchChange = useCallback((value: string) => {
        setSearchValue(value);
    }, []);

    const handleStateFilterChange = useCallback((value: string) => {
        setStateFilter(value);
    }, []);

    const handlePageSizeChange = useCallback((newPageSize: number) => {
        table.setPageSize(newPageSize);
        table.setPageIndex(0); // Reset to first page when page size changes
    }, [table]);

    const handlePageChange = useCallback((newPage: number) => {
        const totalPages = table.getPageCount();
        if (newPage >= 1 && newPage <= totalPages && totalPages > 0) {
            table.setPageIndex(newPage - 1);
            // Check if we need to fetch more data after page change
            setTimeout(checkForMoreData, 100);
        }
    }, [table, checkForMoreData]);



    // Skeleton loading component
    const LoadingSkeleton = () => (
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

    // Error state component
    const ErrorState = () => (
        <div className="text-center py-8 flex flex-col items-center justify-center">
            <div className="text-red-600 mb-4">
                <AlertTriangle className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Issues</h3>
            <p className="text-gray-600 mb-4">{error?.message}</p>
            <Button onClick={() => refetch()} variant="BorderStyle">
                Try Again
            </Button>
        </div>
    );

    // Empty state component
    const EmptyState = () => (
        <div className="text-center py-8 flex flex-col items-center justify-center">
            <div className="text-gray-400 mb-4">
                <Inbox className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Issues Found</h3>
            <p className="text-gray-600">Try adjusting your filters or search criteria.</p>
        </div>
    );

    // Safe pagination calculations to prevent errors with empty data
    const totalPages = filteredData && filteredData.length > 0 ? table.getPageCount() : 0;
    const currentPage = filteredData && filteredData.length > 0 ? table.getState().pagination.pageIndex + 1 : 1;
    const pageSize = table.getState().pagination.pageSize;
    const totalItems = filteredData ? filteredData.length : 0;

    return (
        <div className={`space-y-4 ${className || ''}`}>
            {/* Header with controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="typography-headers-medium-medium text-content-presentation-global-primary">
                        {owner}/{repo} Issues
                    </h2>
                    <p className="typography-body-small-medium flex items-center gap-2 text-content-presentation-global-secondary">
                        {totalItems} total issues
                        {currentServerPage > 1 && (
                            <span className="text-xs text-gray-400">
                                (Page {currentServerPage} loaded)
                            </span>
                        )}
                        {(isFetching || isRefetching) && (
                            <SpinLoading className="w-6 h-6" />
                        )}
                        {Object.keys(dataCache).length > 1 && (
                            <span className="text-xs text-blue-500">
                                • {Object.keys(dataCache).length} filter combinations cached
                            </span>
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => { refetch(); }}
                        disabled={loading || isFetching}
                        size="XL"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>

                    {Object.keys(dataCache).length > 1 && (
                        <Button
                            onClick={() => {
                                dataCacheRef.current = {};
                                serverPageCacheRef.current = {};
                                setDataCache({});
                                setServerPageCache({});
                                setCurrentServerPage(1);
                                setAllFetchedData([]);
                                refetch();
                            }}
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
                            <Button size="XL" >
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
                                        setColumnVisibility(prev => ({ ...prev, [column.id]: checked }))
                                    }
                                >
                                    {column.header}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <InputField
                    placeholder="Search issues..."
                    value={searchValue}
                    onChange={(e) => handleSearchChange(e.target.value)}
                />

                <Select
                    value={stateFilter}
                    onValueChange={handleStateFilterChange}
                >
                    <SelectTrigger size={"XL"} >
                        <SelectValue placeholder="Select state..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => handlePageSizeChange(parseInt(value))}
                >
                    <SelectTrigger size={"XL"}>
                        <SelectValue placeholder="Page size..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="10">10 per page</SelectItem>
                        <SelectItem value="25">25 per page</SelectItem>
                        <SelectItem value="50">50 per page</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="border border-border-presentation-action-borderstyle rounded-lg overflow-x-auto">
                {loading && <LoadingSkeleton />}
                {error && <ErrorState />}
                {!loading && !error && filteredData.length === 0 && <EmptyState />}

                {!loading && !error && filteredData.length > 0 && (
                    <Table theme={theme}>
                        <TableHeader>
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
                        </TableHeader>
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

            {/* Pagination */}
            {!loading && !error && filteredData.length > 0 && (
                <div className="flex items-center justify-between">
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

                    <div className="flex items-center gap-2">
                        {currentPage > 5 && (
                            <ActionButton
                                variant="BorderStyle"
                                onClick={() => handlePageChange(1)}
                                disabled={isFetching}
                                size="M"
                                title="Back to first page"
                            >
                                <span className="text-xs font-medium">First</span>
                            </ActionButton>
                        )}
                        <ActionButton
                            variant="BorderStyle"
                            onClick={() => handlePageChange(1)}
                            disabled={!table.getCanPreviousPage() || isFetching}
                            size="M"
                        >
                            <ChevronFirst className="w-4 h-4" />
                        </ActionButton>
                        <ActionButton
                            variant="BorderStyle"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage() || isFetching}
                            size="M"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </ActionButton>

                        <span className="px-4 py-2 text-sm">
                            Page {currentPage} of {totalPages}
                        </span>

                        <ActionButton
                            variant="BorderStyle"
                            onClick={() => {
                                table.nextPage();
                                // Check for more data after a short delay
                                setTimeout(checkForMoreData, 100);
                            }}
                            disabled={!table.getCanNextPage() || isFetching}
                            size="M"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </ActionButton>
                        <ActionButton
                            variant="BorderStyle"
                            onClick={() => {
                                handlePageChange(totalPages);
                            }}
                            disabled={!table.getCanNextPage() || isFetching}
                            size="M"
                        >
                            <ChevronLast className="w-4 h-4" />
                        </ActionButton>
                    </div>
                </div>
            )}
        </div>
    );
}
