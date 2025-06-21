import { HomeDataTable } from '@/components/shared/HomeDataTable';

export default function Home() {
  return (
    <div className="container mx-auto p-2 md:py-8">
      <div className="mb-8">
        <h1 className="typography-display-large-bold text-content-presentation-global-primary mb-2">
          GitHub Issues Management
        </h1>
        <p className="typography-headers-medium-regular text-content-presentation-global-secondary mb-6">
          Enterprise-grade datatable for managing GitHub Issues with advanced features
        </p>
      </div>

      <HomeDataTable />
    </div>
  );
}
