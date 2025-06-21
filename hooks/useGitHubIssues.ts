'use client'

import { useQuery } from '@tanstack/react-query';
import { GitHubIssue, SortConfig, FilterConfig, PaginationConfig, ApiError } from '../utils/types';
import { githubIssuesService, GitHubIssuesServiceResponse } from '../services/githubIssuesService';

interface UseGitHubIssuesParams {
    owner: string;
    repo: string;
    sorting: SortConfig[];
    filters: FilterConfig;
    pagination: PaginationConfig;
    enabled?: boolean;
}

interface UseGitHubIssuesReturn {
    data: GitHubIssue[];
    loading: boolean;
    error: ApiError | null;
    refetch: () => void;
    totalCount: number;
    isRefetching: boolean;
    isFetching: boolean;
}

export function useGitHubIssues({
    owner,
    repo,
    sorting,
    filters,
    pagination,
    enabled = true
}: UseGitHubIssuesParams): UseGitHubIssuesReturn {
    // Create unique query key for caching
    const queryKey = [
        'github-issues',
        owner,
        repo,
        sorting,
        filters,
        pagination
    ];

    // Build API parameters using service
    const buildApiParams = () => {
        return githubIssuesService.convertDataTableStateToParams(
            owner,
            repo,
            sorting,
            filters,
            pagination
        );
    };

    // Use TanStack Query for data fetching
    const query = useQuery({
        queryKey,
        queryFn: async (): Promise<GitHubIssuesServiceResponse> => {
            const apiParams = buildApiParams();
            return await githubIssuesService.getIssues(apiParams);
        },
        enabled,
        // Stale time: 5 minutes (data is considered fresh for 5 minutes)
        staleTime: 5 * 60 * 1000,
        // Cache time: 10 minutes (data stays in cache for 10 minutes)
        gcTime: 10 * 60 * 1000,
        // Retry configuration
        retry: (failureCount, error: any) => {
            // Don't retry for 4xx errors (client errors)
            if (error?.status >= 400 && error?.status < 500) {
                return false;
            }
            return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Network mode
        networkMode: 'online',
        // Refetch on window focus
        refetchOnWindowFocus: false,
    });

    // Transform error to our ApiError format
    const transformedError: ApiError | null = query.error ? {
        message: (query.error as any)?.message || 'Failed to fetch issues',
        status: (query.error as any)?.status || 500,
        retry: query.failureCount < 3
    } : null;

    return {
        data: query.data?.data || [],
        loading: query.isLoading,
        error: transformedError,
        refetch: () => query.refetch(),
        totalCount: query.data?.totalCount || 0,
        isRefetching: query.isRefetching,
        isFetching: query.isFetching,
    };
} 