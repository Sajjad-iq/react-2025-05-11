'use client'

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// Create a client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Cache for 5 minutes
            staleTime: 5 * 60 * 1000,
            // Keep cache for 10 minutes
            gcTime: 10 * 60 * 1000,
            // Retry failed requests 3 times with exponential backoff
            retry: (failureCount, error: any) => {
                // Don't retry for 4xx errors (client errors)
                if (error?.status >= 400 && error?.status < 500) {
                    return false
                }
                return failureCount < 3
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Refetch on window focus
            refetchOnWindowFocus: false,
            // Network mode
            networkMode: 'online',
        },
        mutations: {
            retry: 1,
            networkMode: 'online',
        },
    },
})

interface ProvidersProps {
    children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
    )
} 