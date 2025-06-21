'use client'

import { useState } from 'react';
import { GitHubIssuesDataTable } from '../components/DataTable';
import { InputField } from '../components/InputField';
import { Button } from '../components/Button';

export default function Home() {
  const [owner, setOwner] = useState('facebook');
  const [repo, setRepo] = useState('react');
  const [gitUrl, setGitUrl] = useState('');
  const [urlError, setUrlError] = useState('');

  const extractRepoFromUrl = (url: string): { owner: string; repo: string } | null => {
    try {
      // Remove trailing slash and .git if present
      const cleanUrl = url.replace(/\/$/, '').replace(/\.git$/, '');

      // Match GitHub URL patterns
      const githubPattern = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)/;
      const match = cleanUrl.match(githubPattern);

      if (match && match[1] && match[2]) {
        return {
          owner: match[1],
          repo: match[2]
        };
      }

      return null;
    } catch {
      return null;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError('');

    if (!gitUrl.trim()) {
      setUrlError('Please enter a GitHub repository URL');
      return;
    }

    const extracted = extractRepoFromUrl(gitUrl.trim());

    if (extracted) {
      setOwner(extracted.owner);
      setRepo(extracted.repo);
      setUrlError('');
    } else {
      setUrlError('Invalid GitHub URL. Please use format: https://github.com/owner/repo');
    }
  };

  const handleReset = () => {
    setOwner('facebook');
    setRepo('react');
    setGitUrl('');
    setUrlError('');
  };

  return (
    <div className="container mx-auto py-8 ">
      <div className="mb-8">
        <h1 className="typography-display-large-bold text-content-presentation-global-primary mb-2">
          GitHub Issues Management
        </h1>
        <p className="typography-headers-medium-regular text-content-presentation-global-secondary mb-6">
          Enterprise-grade datatable for managing GitHub Issues with advanced features
        </p>

        {/* Repository Input Form */}
        <div className="p-6 rounded-lg border mb-8 bg-background-system-body-secondary">
          <h2 className="typography-headers-medium-medium text-content-presentation-global-primary mb-4">
            Repository Configuration
          </h2>
          <p className="typography-body-medium-regular text-content-presentation-global-secondary mb-4">
            Paste any GitHub repository URL to view its issues, or use the default React repository.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="typography-body-small-medium text-content-presentation-global-primary block mb-2">
                GitHub Repository URL
              </label>
              <InputField
                placeholder="https://github.com/facebook/react"
                value={gitUrl}
                onChange={(e) => setGitUrl(e.target.value)}
                className={urlError ? 'border-red-500' : ''}
              />
              {urlError && (
                <p className="typography-body-small-regular text-red-600 mt-1">
                  {urlError}
                </p>
              )}
              <p className="typography-body-small-regular text-content-presentation-global-secondary mt-1">
                Supports formats: https://github.com/owner/repo, github.com/owner/repo, or owner/repo
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                size="XL"
                disabled={!gitUrl.trim()}
              >
                Load Issues
              </Button>
              <Button
                type="button"
                variant="BorderStyle"
                size="XL"
                onClick={handleReset}
              >
                Reset to Default
              </Button>
            </div>
          </form>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="typography-body-small-regular text-blue-800">
              <strong>Currently viewing:</strong> {owner}/{repo}
              {owner === 'facebook' && repo === 'react' && ' (default)'}
            </p>
          </div>
        </div>
      </div>

      <GitHubIssuesDataTable
        owner={owner}
        repo={repo}
        className="w-full"
      />
    </div>
  );
}
