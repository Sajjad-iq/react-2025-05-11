'use client'

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// Create a stable client instance
let queryClient: QueryClient | undefined = undefined;

function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                // Cache for 5 minutes
                staleTime: 5 * 60 * 1000,
                // Keep cache for 10 minutes
                gcTime: 10 * 60 * 1000,
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
}

function getQueryClient() {
    if (typeof window === 'undefined') {
        // Server: always make a new query client
        return makeQueryClient()
    } else {
        // Browser: make a new query client if we don't already have one
        if (!queryClient) queryClient = makeQueryClient()
        return queryClient
    }
}

interface ProvidersProps {
    children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
    const client = getQueryClient()

    return (
        <QueryClientProvider client={client}>
            {children}
            {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
    )
} 