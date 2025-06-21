'use client'

import { useState } from 'react';
import { GitHubIssuesDataTable } from '../components/DataTable';
import { GitHubRepoForm } from '../components/GitHubRepoForm';
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function Home() {
  const [owner, setOwner] = useState('facebook');
  const [repo, setRepo] = useState('react');

  const handleRepoChange = (newOwner: string, newRepo: string) => {
    setOwner(newOwner);
    setRepo(newRepo);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="typography-display-large-bold text-content-presentation-global-primary mb-2">
          GitHub Issues Management
        </h1>
        <p className="typography-headers-medium-regular text-content-presentation-global-secondary mb-6">
          Enterprise-grade datatable for managing GitHub Issues with advanced features
        </p>

        <GitHubRepoForm
          onRepoChange={handleRepoChange}
          currentOwner={owner}
          currentRepo={repo}
        />
      </div>

      <ErrorBoundary>
        <GitHubIssuesDataTable
          key={`${owner}/${repo}`}
          owner={owner}
          repo={repo}
          className="w-full"
        />
      </ErrorBoundary>
    </div>
  );
}
