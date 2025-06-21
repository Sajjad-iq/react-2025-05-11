
import { GitHubIssuesDataTable } from '../components/DataTable';

export default function Home() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          GitHub Issues Management
        </h1>
        <p className="text-gray-600">
          Enterprise-grade datatable for managing GitHub Issues with advanced features
        </p>
      </div>

      <GitHubIssuesDataTable
        owner="facebook"
        repo="react"
        className="w-full"
      />
    </div>
  );
}
