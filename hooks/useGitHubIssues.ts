'use client'

import { useQuery } from '@tanstack/react-query';
import { useMemo, useEffect } from 'react';
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
    // Debug logging
    useEffect(() => {
        console.log('useGitHubIssues params changed:', { owner, repo, sorting, filters, pagination, enabled });
    }, [owner, repo, sorting, filters, pagination, enabled]);

    // Memoize the query key to prevent infinite re-renders
    const queryKey = useMemo(() => {
        const key = [
            'github-issues',
            owner,
            repo,
            JSON.stringify(sorting),
            JSON.stringify(filters),
            JSON.stringify(pagination)
        ];
        console.log('Query key generated:', key);
        return key;
    }, [owner, repo, sorting, filters, pagination]);

    // Memoize API parameters to prevent unnecessary rebuilds
    const apiParams = useMemo(() => {
        const params = githubIssuesService.convertDataTableStateToParams(
            owner,
            repo,
            sorting,
            filters,
            pagination
        );
        console.log('API params generated:', params);
        return params;
    }, [owner, repo, sorting, filters, pagination]);

    // Use TanStack Query for data fetching
    const query = useQuery({
        queryKey,
        queryFn: async (): Promise<GitHubIssuesServiceResponse> => {
            console.log('Fetching data with params:', apiParams);
            try {
                const result = await githubIssuesService.getIssues(apiParams);
                console.log('Data fetched successfully:', { count: result.data.length, totalCount: result.totalCount });
                return result;
            } catch (error) {
                console.error('Error fetching data:', error);
                throw error;
            }
        },
        enabled,
        // Stale time: 5 minutes (data is considered fresh for 5 minutes)
        staleTime: 5 * 60 * 1000,
        // Cache time: 10 minutes (data stays in cache for 10 minutes)
        gcTime: 10 * 60 * 1000,
        // Retry configuration
        retry: (failureCount, error: any) => {
            console.log('Retry attempt:', failureCount, error);
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

    // Memoize transformed error to prevent unnecessary re-renders
    const transformedError: ApiError | null = useMemo(() => {
        if (!query.error) return null;

        const error = {
            message: (query.error as any)?.message || 'Failed to fetch issues',
            status: (query.error as any)?.status || 500,
            retry: query.failureCount < 3
        };
        console.log('Transformed error:', error);
        return error;
    }, [query.error, query.failureCount]);

    const result = {
        data: query.data?.data || [],
        loading: query.isLoading,
        error: transformedError,
        refetch: () => query.refetch(),
        totalCount: query.data?.totalCount || 0,
        isRefetching: query.isRefetching,
        isFetching: query.isFetching,
    };

    console.log('useGitHubIssues result:', {
        dataLength: result.data.length,
        loading: result.loading,
        error: result.error,
        totalCount: result.totalCount,
        isRefetching: result.isRefetching,
        isFetching: result.isFetching
    });

    return result;
} 