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
import { GitHubIssue, ColumnConfig, SortConfig, FilterConfig, PaginationConfig } from "../utils/types"
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

    // Data fetching with TanStack Query hook - fetch all data for local operations
    const { data, loading, error, refetch, totalCount, isRefetching, isFetching } = useGitHubIssues({
        owner,
        repo,
        sorting: [], // No server-side sorting
        filters: { state: stateFilter }, // Only server-side state filter
        pagination: { page: 1, pageSize: 100, total: 0 }, // Fetch more data for local operations
        enabled: true
    });



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

    // React Table instance with client-side operations
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        state: {
            columnVisibility,
            globalFilter: searchValue,
        },
        onColumnVisibilityChange: setColumnVisibility,
        onGlobalFilterChange: setSearchValue,
        enableColumnResizing: false,
        enableSorting: true,
        enableFilters: true,
        enableGlobalFilter: true,
        initialState: {
            pagination: {
                pageSize: 25,
            },
            sorting: [{ id: 'created_at', desc: true }],
        },
    });

    // Debounce search input
    const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const handleSearchChange = useCallback((value: string) => {
        // Update local state immediately for UI responsiveness
        setSearchValue(value);

        // Debounce the actual table filter
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            table.setGlobalFilter(value);
        }, 300);
    }, [table]);

    const handleStateFilterChange = useCallback((value: string) => {
        setStateFilter(value);
    }, []);

    const handlePageSizeChange = useCallback((newPageSize: number) => {
        table.setPageSize(newPageSize);
    }, [table]);

    const handlePageChange = useCallback((newPage: number) => {
        if (newPage >= 1 && newPage <= table.getPageCount()) {
            table.setPageIndex(newPage - 1);
        }
    }, [table]);



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
        <div className="text-center py-8">
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
        <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
                <Inbox className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Issues Found</h3>
            <p className="text-gray-600">Try adjusting your filters or search criteria.</p>
        </div>
    );

    const totalPages = table.getPageCount();
    const currentPage = table.getState().pagination.pageIndex + 1;
    const pageSize = table.getState().pagination.pageSize;
    const totalItems = table.getFilteredRowModel().rows.length;

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
                        {(isFetching || isRefetching) && (
                            <SpinLoading className="w-6 h-6" />
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
                        <SelectValue />
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
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="border border-border-presentation-action-borderstyle rounded-lg overflow-x-auto">
                {loading && <LoadingSkeleton />}
                {error && <ErrorState />}
                {!loading && !error && data.length === 0 && <EmptyState />}

                {!loading && !error && data.length > 0 && (
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
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Pagination */}
            {!loading && !error && data.length > 0 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        Showing {((currentPage - 1) * pageSize) + 1} to{' '}
                        {Math.min(currentPage * pageSize, totalItems)} of{' '}
                        {totalItems} results
                    </div>

                    <div className="flex items-center gap-2">
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
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage() || isFetching}
                            size="M"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </ActionButton>
                        <ActionButton
                            variant="BorderStyle"
                            onClick={() => handlePageChange(totalPages)}
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
