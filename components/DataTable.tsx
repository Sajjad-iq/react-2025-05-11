'use client'

import * as React from "react"
import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    Row,
    SortingState,
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
import { Checkbox } from "./Checkbox"
import { Button } from "./Button"
import { Input } from "./Input"
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

interface DataTableProps<TData extends { id: string | number }, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    theme?: "dark" | "light" | "default"
}

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

export function DataTable<TData extends { id: string | number }, TValue>({
    columns,
    data,
    theme = "default",
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [rowSelection, setRowSelection] = React.useState({})

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        onRowSelectionChange: setRowSelection,
        enableRowSelection: true,
        enableMultiRowSelection: true,
        state: {
            sorting,
            rowSelection,
        },
    })

    return (
        <Table theme={theme}>
            <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                        <TableHead isDummy >
                            <Checkbox
                                checked={table.getIsAllRowsSelected()}
                                onCheckedChange={(checked) => {
                                    table.toggleAllRowsSelected(!!checked)
                                }}
                            />
                        </TableHead>
                        {headerGroup.headers.map((header) => {
                            const sortHandler = header.column.getToggleSortingHandler()
                            return (
                                <TableHead
                                    key={header.id}
                                    onSort={sortHandler ? () => sortHandler({}) : undefined}
                                    sortType={header.column.getIsSorted() as "asc" | "desc" | undefined}
                                >
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
                                </TableHead>
                            )
                        })}
                    </TableRow>
                ))}
            </TableHeader>
            <TableBody>
                {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row, i) => (
                        <TableRow key={i + "row"} state={row.getIsSelected() ? "selected" : undefined}>
                            <TableCell isDummy >
                                <Checkbox
                                    checked={row.getIsSelected()}
                                    onCheckedChange={(checked) => {
                                        row.toggleSelected(!!checked)
                                    }}
                                />
                            </TableCell>
                            {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={columns.length + 1} className="h-24 text-center">
                            No results.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    )
}

// GitHub Issues DataTable Component
export function GitHubIssuesDataTable({ owner, repo, className, theme = "default" }: GitHubIssuesDataTableProps) {
    // State management
    const [sorting, setSorting] = useState<SortConfig[]>([{ id: 'created_at', desc: true }]);
    const [filters, setFilters] = useState<FilterConfig>({ state: 'all' });
    const [pagination, setPagination] = useState<PaginationConfig>({
        page: 1,
        pageSize: 25,
        total: 0
    });
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        return defaultColumns.reduce((acc, col) => ({ ...acc, [col.id]: col.visible }), {});
    });

    // Persist column visibility (simplified)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (typeof window !== 'undefined') {
                localStorage.setItem(`github-issues-columns-${owner}-${repo}`, JSON.stringify(columnVisibility));
            }
        }, 100);
        return () => clearTimeout(timeoutId);
    }, [columnVisibility, owner, repo]);

    // Data fetching with TanStack Query hook
    const { data, loading, error, refetch, totalCount, isRefetching, isFetching } = useGitHubIssues({
        owner,
        repo,
        sorting,
        filters,
        pagination,
        enabled: true
    });

    // Update total count when data changes
    useEffect(() => {
        if (totalCount > 0 && totalCount !== pagination.total) {
            setPagination(prev => ({ ...prev, total: totalCount }));
        }
    }, [totalCount]);

    // Memoized column definitions for performance
    const columns = useMemo<ColumnDef<GitHubIssue>[]>(() => [
        {
            id: 'number',
            header: 'Issue #',
            cell: ({ row }) => (
                <a
                    href={row.original.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-medium"
                >
                    #{row.original.number}
                </a>
            ),
        },
        {
            id: 'title',
            header: 'Issue Title',
            cell: ({ row }) => (
                <div className="max-w-md">
                    <a
                        href={row.original.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-900 hover:text-blue-600 font-medium line-clamp-2"
                        title={row.original.title}
                    >
                        {row.original.title}
                    </a>
                </div>
            ),
        },
        {
            id: 'state',
            header: 'Status',
            cell: ({ row }) => (
                <Badge
                    variant={row.original.state === 'open' ? 'green' : 'gray'}
                    className="capitalize"
                >
                    {row.original.state}
                </Badge>
            ),
        },
        {
            id: 'user',
            header: 'Author',
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
            header: 'Labels',
            cell: ({ row }) => (
                <div className="flex flex-wrap gap-1 max-w-48">
                    {row.original.labels.slice(0, 3).map((label) => (
                        <Badge
                            key={label.id}
                            style={{ backgroundColor: `#${label.color}`, color: '#fff' }}
                            className="text-xs px-1 py-0.5"
                        >
                            {label.name}
                        </Badge>
                    ))}
                    {row.original.labels.length > 3 && (
                        <Badge variant="gray" className="text-xs">
                            +{row.original.labels.length - 3}
                        </Badge>
                    )}
                </div>
            ),
        },
        {
            id: 'assignees',
            header: 'Assignees',
            cell: ({ row }) => (
                <div className="flex -space-x-1">
                    {row.original.assignees.slice(0, 3).map((assignee) => (
                        <img
                            key={assignee.id}
                            src={assignee.avatar_url}
                            alt={assignee.login}
                            className="w-6 h-6 rounded-full border-2 border-white"
                            title={assignee.login}
                        />
                    ))}
                    {row.original.assignees.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs">
                            +{row.original.assignees.length - 3}
                        </div>
                    )}
                </div>
            ),
        },
        {
            id: 'comments',
            header: 'Comments',
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <i className="ri-message-2-line text-gray-400" />
                    <span className="text-sm">{row.original.comments}</span>
                </div>
            ),
        },
        {
            id: 'created_at',
            header: 'Created',
            cell: ({ row }) => (
                <span className="text-sm text-gray-600">
                    {format(new Date(row.original.created_at), 'MMM dd, yyyy')}
                </span>
            ),
        },
        {
            id: 'updated_at',
            header: 'Updated',
            cell: ({ row }) => (
                <span className="text-sm text-gray-600">
                    {format(new Date(row.original.updated_at), 'MMM dd, yyyy')}
                </span>
            ),
        },
    ], []);

    // React Table instance with server-side operations
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        manualSorting: true,
        manualFiltering: true,
        state: {
            columnVisibility,
        },
        onColumnVisibilityChange: setColumnVisibility,
        enableColumnResizing: false,
        enableSorting: false,
        enableFilters: false,
    });

    // Handlers
    const handleSortChange = useCallback((columnId: string) => {
        setSorting(prev => {
            const existing = prev.find(s => s.id === columnId);
            if (existing) {
                if (existing.desc) {
                    return prev.filter(s => s.id !== columnId);
                } else {
                    return prev.map(s => s.id === columnId ? { ...s, desc: true } : s);
                }
            } else {
                return [{ id: columnId, desc: false }, ...prev.slice(0, 1)]; // Keep max 2 sort columns
            }
        });
    }, []);
    // Debounce search input
    const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const handleFilterChange = useCallback((columnId: string, value: any) => {
        if (columnId === 'search') {
            // Debounce search input
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
            searchTimeoutRef.current = setTimeout(() => {
                setFilters(prev => ({ ...prev, [columnId]: value }));
                setPagination(prev => ({ ...prev, page: 1 }));
            }, 300);
        } else {
            setFilters(prev => ({ ...prev, [columnId]: value }));
            setPagination(prev => ({ ...prev, page: 1 }));
        }
    }, []);

    const handlePageSizeChange = useCallback((newPageSize: number) => {
        setPagination(prev => ({
            ...prev,
            pageSize: newPageSize,
            page: 1
        }));
    }, []);

    const handlePageChange = useCallback((newPage: number) => {
        setPagination(prev => ({
            ...prev,
            page: newPage
        }));
    }, []);

    // Skeleton loading component
    const LoadingSkeleton = () => (
        <div className="space-y-2 p-4">
            {Array.from({ length: pagination.pageSize }).map((_, i) => (
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
                <i className="ri-error-warning-line text-4xl" />
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
                <i className="ri-inbox-line text-4xl" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Issues Found</h3>
            <p className="text-gray-600">Try adjusting your filters or search criteria.</p>
        </div>
    );

    const totalPages = Math.ceil(pagination.total / pagination.pageSize);

    return (
        <div className={`space-y-4 ${className || ''}`}>
            {/* Header with controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        {owner}/{repo} Issues
                    </h2>
                    <p className="text-gray-600 flex items-center gap-2">
                        {pagination.total} total issues
                        {(isFetching || isRefetching) && (
                            <SpinLoading size="S" />
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => { refetch(); }}
                        variant="BorderStyle"
                        disabled={loading || isFetching}
                    >
                        <i className="ri-refresh-line mr-2" />
                        Refresh
                    </Button>

                    {/* Column visibility toggle */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="BorderStyle">
                                <i className="ri-settings-3-line mr-2" />
                                Columns
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
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
            <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-64">
                    <Input
                        placeholder="Search issues..."
                        value={filters.search || ''}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                </div>

                <Select
                    value={filters.state || 'all'}
                    onValueChange={(value) => handleFilterChange('state', value)}
                >
                    <SelectTrigger className="w-32">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={pagination.pageSize.toString()}
                    onValueChange={(value) => handlePageSizeChange(parseInt(value))}
                >
                    <SelectTrigger className="w-20">
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
            <div className="border rounded-lg overflow-hidden">
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
                                        const sortConfig = sorting.find(s => s.id === header.id);

                                        return (
                                            <TableHead
                                                key={header.id}
                                                sortType={sortConfig ? (sortConfig.desc ? 'desc' : 'asc') : undefined}
                                                onSort={column?.sortable ? () => handleSortChange(header.id) : undefined}
                                                style={{ width: column?.width }}
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
                        Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
                        {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                        {pagination.total} results
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="BorderStyle"
                            onClick={() => handlePageChange(1)}
                            disabled={pagination.page === 1 || isFetching}
                        >
                            First
                        </Button>
                        <Button
                            variant="BorderStyle"
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page === 1 || isFetching}
                        >
                            Previous
                        </Button>

                        <span className="px-4 py-2 text-sm">
                            Page {pagination.page} of {totalPages}
                        </span>

                        <Button
                            variant="BorderStyle"
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page === totalPages || isFetching}
                        >
                            Next
                        </Button>
                        <Button
                            variant="BorderStyle"
                            onClick={() => handlePageChange(totalPages)}
                            disabled={pagination.page === totalPages || isFetching}
                        >
                            Last
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
