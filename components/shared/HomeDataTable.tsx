'use client'
import React, { useState } from 'react'
import { GitHubRepoForm } from '../GitHubRepoForm'
import { ErrorBoundary } from '../ErrorBoundary'
import { GitHubIssuesDataTable } from '../DataTable'

export const HomeDataTable = () => {
    const [owner, setOwner] = useState('facebook');
    const [repo, setRepo] = useState('react');

    const handleRepoChange = (newOwner: string, newRepo: string) => {
        setOwner(newOwner);
        setRepo(newRepo);
    };
    return (
        <>
            <GitHubRepoForm
                onRepoChange={handleRepoChange}
                currentOwner={owner}
                currentRepo={repo}
            />

            <ErrorBoundary>
                <GitHubIssuesDataTable
                    key={`${owner}/${repo}`}
                    owner={owner}
                    repo={repo}
                    className="w-full"
                />
            </ErrorBoundary>
        </>
    )
}
