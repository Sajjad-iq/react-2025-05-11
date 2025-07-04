'use client'

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from './Form';
import { InputField } from './InputField';
import { Button } from './Button';

// Zod validation schema
const formSchema = z.object({
    gitUrl: z
        .string()
        .min(1, 'Please enter a GitHub repository URL')
        .refine((url) => {
            try {
                // Remove trailing slash and .git if present
                const cleanUrl = url.replace(/\/$/, '').replace(/\.git$/, '');

                // Match GitHub URL patterns
                const githubPattern = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)/;
                const shortPattern = /^([^\/\s]+)\/([^\/\s]+)$/; // owner/repo format

                return githubPattern.test(cleanUrl) || shortPattern.test(cleanUrl);
            } catch {
                return false;
            }
        }, 'Invalid GitHub URL. Please use format: https://github.com/owner/repo or owner/repo')
});

type FormData = z.infer<typeof formSchema>;

interface RepoInfo {
    owner: string;
    repo: string;
}

// Custom hook for URL parsing logic
const useRepoUrlParser = () => {
    const extractRepoFromUrl = (url: string): RepoInfo | null => {
        try {
            // Remove trailing slash and .git if present
            const cleanUrl = url.replace(/\/$/, '').replace(/\.git$/, '');

            // Try GitHub URL pattern first
            const githubPattern = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)/;
            const githubMatch = cleanUrl.match(githubPattern);

            if (githubMatch && githubMatch[1] && githubMatch[2]) {
                return {
                    owner: githubMatch[1],
                    repo: githubMatch[2]
                };
            }

            // Try short format (owner/repo)
            const shortPattern = /^([^\/\s]+)\/([^\/\s]+)$/;
            const shortMatch = cleanUrl.match(shortPattern);

            if (shortMatch && shortMatch[1] && shortMatch[2]) {
                return {
                    owner: shortMatch[1],
                    repo: shortMatch[2]
                };
            }

            return null;
        } catch {
            return null;
        }
    };

    return { extractRepoFromUrl };
};

// Custom hook for form logic
const useRepoForm = (onRepoChange: (owner: string, repo: string) => void) => {
    const { extractRepoFromUrl } = useRepoUrlParser();

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            gitUrl: '',
        },
    });

    const onSubmit = (data: FormData) => {
        const extracted = extractRepoFromUrl(data.gitUrl.trim());

        if (extracted) {
            onRepoChange(extracted.owner, extracted.repo);
            form.reset();
        }
    };

    const handleReset = () => {
        onRepoChange('facebook', 'react');
        form.reset();
    };

    return {
        form,
        onSubmit,
        handleReset
    };
};

// Sub-component for the current repository display
interface CurrentRepoDisplayProps {
    owner: string;
    repo: string;
}

const CurrentRepoDisplay = ({ owner, repo }: CurrentRepoDisplayProps) => (
    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="typography-body-small-regular text-blue-800">
            <strong>Currently viewing:</strong> {owner}/{repo}
            {owner === 'facebook' && repo === 'react' && ' (default)'}
        </p>
    </div>
);

// Sub-component for the form header
const FormHeader = () => (
    <>
        <h2 className="typography-headers-medium-medium text-content-presentation-global-primary mb-4">
            Repository Configuration
        </h2>
        <p className="typography-body-medium-regular text-content-presentation-global-secondary mb-4">
            Paste any GitHub repository URL to view its issues, or use the default React repository.
        </p>
    </>
);

// Sub-component for form actions
interface FormActionsProps {
    onReset: () => void;
}

const FormActions = ({ onReset }: FormActionsProps) => (
    <div className="flex gap-2">
        <Button
            type="submit"
            size="XL"
        >
            Load Issues
        </Button>
        <Button
            type="button"
            variant="BorderStyle"
            size="XL"
            onClick={onReset}
        >
            Reset to Default
        </Button>
    </div>
);

// Main component interface
interface GitHubRepoFormProps {
    onRepoChange: (owner: string, repo: string) => void;
    currentOwner: string;
    currentRepo: string;
}

// Main component - now much cleaner
export function GitHubRepoForm({ onRepoChange, currentOwner, currentRepo }: GitHubRepoFormProps) {
    const { form, onSubmit, handleReset } = useRepoForm(onRepoChange);

    return (
        <div className="p-6 rounded-lg border mb-8 bg-background-system-body-secondary">
            <FormHeader />

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="gitUrl"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel
                                    label="GitHub Repository URL"
                                    size="M"
                                    variant="SystemStyle"
                                />
                                <FormControl>
                                    <InputField
                                        placeholder="https://github.com/facebook/react"
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription className="text-content-presentation-global-secondary">
                                    Supports formats: https://github.com/owner/repo, github.com/owner/repo, or owner/repo
                                </FormDescription>
                                <FormMessage className="text-content-presentation-state-negative" />
                            </FormItem>
                        )}
                    />

                    <FormActions onReset={handleReset} />
                </form>
            </Form>

            <CurrentRepoDisplay owner={currentOwner} repo={currentRepo} />
        </div>
    );
} 