import { apiClient } from '../config/axiosConfig';
import { AxiosResponse } from 'axios';
import { GitHubIssue, SortConfig, FilterConfig, PaginationConfig, GitHubIssuesResponse } from '../utils/types';

export interface GitHubIssuesParams {
    owner: string;
    repo: string;
    page?: number;
    per_page?: number;
    sort?: 'created' | 'updated' | 'comments';
    direction?: 'asc' | 'desc';
    state?: 'open' | 'closed' | 'all';
    labels?: string;
    assignee?: string;
    creator?: string;
    mentioned?: string;
    since?: string;
}

export interface GitHubIssuesServiceResponse {
    data: GitHubIssue[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
    perPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

class GitHubIssuesService {
    /**
     * Fetch GitHub issues with pagination and filtering
     */
    async getIssues(params: GitHubIssuesParams): Promise<GitHubIssuesServiceResponse> {
        try {
            const {
                owner,
                repo,
                page = 1,
                per_page = 25,
                sort = 'created',
                direction = 'desc',
                state = 'all',
                labels,
                assignee,
                creator,
                mentioned,
                since
            } = params;

            // Build query parameters
            const queryParams: Record<string, string | number> = {
                page,
                per_page,
                sort,
                direction,
                state
            };

            // Add optional filters
            if (labels) queryParams.labels = labels;
            if (assignee) queryParams.assignee = assignee;
            if (creator) queryParams.creator = creator;
            if (mentioned) queryParams.mentioned = mentioned;
            if (since) queryParams.since = since;

            const response: AxiosResponse<GitHubIssue[]> = await apiClient.get(
                `/repos/${owner}/${repo}/issues`,
                { params: queryParams }
            );

            // Parse pagination info from Link header
            const linkHeader = response.headers.link || '';
            const totalCount = this.extractTotalCount(linkHeader, response.data.length, page, per_page);
            const totalPages = Math.ceil(totalCount / per_page);

            return {
                data: response.data,
                totalCount,
                currentPage: page,
                totalPages,
                perPage: per_page,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            };
        } catch (error) {
            console.error('Error fetching GitHub issues:', error);
            throw this.handleApiError(error);
        }
    }

    /**
     * Get a specific issue by number
     */
    async getIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue> {
        try {
            const response: AxiosResponse<GitHubIssue> = await apiClient.get(
                `/repos/${owner}/${repo}/issues/${issueNumber}`
            );
            return response.data;
        } catch (error) {
            console.error(`Error fetching issue #${issueNumber}:`, error);
            throw this.handleApiError(error);
        }
    }

    /**
     * Search issues with advanced query
     */
    async searchIssues(
        query: string,
        params: {
            sort?: 'created' | 'updated' | 'comments';
            order?: 'asc' | 'desc';
            page?: number;
            per_page?: number;
        } = {}
    ): Promise<GitHubIssuesServiceResponse> {
        try {
            const {
                sort = 'created',
                order = 'desc',
                page = 1,
                per_page = 25
            } = params;

            const response: AxiosResponse<{
                total_count: number;
                incomplete_results: boolean;
                items: GitHubIssue[];
            }> = await apiClient.get('/search/issues', {
                params: {
                    q: query,
                    sort,
                    order,
                    page,
                    per_page
                }
            });

            const totalCount = response.data.total_count;
            const totalPages = Math.ceil(totalCount / per_page);

            return {
                data: response.data.items,
                totalCount,
                currentPage: page,
                totalPages,
                perPage: per_page,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            };
        } catch (error) {
            console.error('Error searching GitHub issues:', error);
            throw this.handleApiError(error);
        }
    }

    /**
     * Get repository labels for filtering
     */
    async getLabels(owner: string, repo: string): Promise<Array<{ name: string; color: string; description: string | null }>> {
        try {
            const response = await apiClient.get(`/repos/${owner}/${repo}/labels`);
            return response.data;
        } catch (error) {
            console.error('Error fetching repository labels:', error);
            throw this.handleApiError(error);
        }
    }

    /**
     * Get repository assignees for filtering
     */
    async getAssignees(owner: string, repo: string): Promise<Array<{ login: string; avatar_url: string }>> {
        try {
            const response = await apiClient.get(`/repos/${owner}/${repo}/assignees`);
            return response.data;
        } catch (error) {
            console.error('Error fetching repository assignees:', error);
            throw this.handleApiError(error);
        }
    }

    /**
     * Convert datatable state to API parameters
     */
    convertDataTableStateToParams(
        owner: string,
        repo: string,
        sorting: SortConfig[],
        filters: FilterConfig,
        pagination: PaginationConfig
    ): GitHubIssuesParams {
        const params: GitHubIssuesParams = {
            owner,
            repo,
            page: pagination.page,
            per_page: pagination.pageSize
        };

        // Handle sorting
        if (sorting.length > 0) {
            const primarySort = sorting[0];
            switch (primarySort.id) {
                case 'created_at':
                    params.sort = 'created';
                    break;
                case 'updated_at':
                    params.sort = 'updated';
                    break;
                case 'comments':
                    params.sort = 'comments';
                    break;
                default:
                    params.sort = 'created';
            }
            params.direction = primarySort.desc ? 'desc' : 'asc';
        }

        // Handle filters
        if (filters.state) {
            params.state = filters.state;
        }
        if (filters.labels && Array.isArray(filters.labels) && filters.labels.length > 0) {
            params.labels = filters.labels.join(',');
        }
        if (filters.assignee) {
            params.assignee = filters.assignee;
        }
        if (filters.creator) {
            params.creator = filters.creator;
        }
        if (filters.mentioned) {
            params.mentioned = filters.mentioned;
        }
        if (filters.since) {
            params.since = filters.since;
        }

        return params;
    }

    /**
     * Extract total count from GitHub API response
     * GitHub doesn't always provide total count, so we estimate it
     */
    private extractTotalCount(linkHeader: string, currentPageSize: number, currentPage: number, perPage: number): number {
        // Try to extract from Link header
        const lastPageMatch = linkHeader.match(/page=(\d+)[^>]*>;\s*rel="last"/);
        if (lastPageMatch) {
            return parseInt(lastPageMatch[1]) * perPage;
        }

        // If no last page, estimate based on current page
        if (currentPageSize < perPage) {
            // This is likely the last page
            return (currentPage - 1) * perPage + currentPageSize;
        }

        // Conservative estimate - at least current page worth of data
        return currentPage * perPage;
    }

    /**
     * Handle API errors with proper typing
     */
    private handleApiError(error: any): Error {
        if (error.response) {
            // Server responded with error status
            const status = error.response.status;
            const message = error.response.data?.message || error.message;

            switch (status) {
                case 403:
                    if (error.response.headers['x-ratelimit-remaining'] === '0') {
                        return new Error('GitHub API rate limit exceeded. Please try again later.');
                    }
                    return new Error('Access forbidden. Please check your GitHub token permissions.');
                case 404:
                    return new Error('Repository or resource not found.');
                case 422:
                    return new Error('Invalid request parameters.');
                default:
                    return new Error(`GitHub API error (${status}): ${message}`);
            }
        } else if (error.request) {
            // Network error
            return new Error('Network error. Please check your internet connection.');
        } else {
            // Other error
            return new Error(`Request error: ${error.message}`);
        }
    }
}

// Export singleton instance
export const githubIssuesService = new GitHubIssuesService();
export default githubIssuesService; 