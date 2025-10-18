'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SessionData } from '@/types/auth';
import { CustomerListItem, CustomersResponse, CustomerFilters, AcquisitionType, ResidentialType, SubscriptionPackage, ChurnTag } from '@/types/customer';
import { Icons } from './icons';

interface CustomerManagementProps {
  session: SessionData;
}

const statusColors: { [key: string]: string } = {
  'Active': 'bg-green-100 text-green-800',
  'Churn': 'bg-red-100 text-red-800',
  'Inactive': 'bg-gray-100 text-gray-800',
  'Pending': 'bg-yellow-100 text-yellow-800',
};

const churnTagColors = {
  'Internal': 'bg-red-100 text-red-800',
  'External': 'bg-orange-100 text-orange-800',
  'N/A': 'bg-gray-100 text-gray-800',
};

const acquisitionColors = {
  'HOMA': 'bg-blue-100 text-blue-800',
  'Altrix': 'bg-purple-100 text-purple-800',
};

export default function CustomerManagement({ session }: CustomerManagementProps) {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filters, setFilters] = useState<CustomerFilters>({
    q: '',
    acquisition: undefined,
    status: '',
    churnTag: undefined,
    city: '',
    residentialType: undefined,
    subscriptionPackage: undefined,
    page: 1,
    limit: 10,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.q) params.append('q', filters.q);
      if (filters.acquisition) params.append('acquisition', filters.acquisition);
      if (filters.status) params.append('status', filters.status);
      if (filters.churnTag) params.append('churnTag', filters.churnTag);
      if (filters.city) params.append('city', filters.city);
      if (filters.residentialType) params.append('residentialType', filters.residentialType);
      if (filters.subscriptionPackage) params.append('subscriptionPackage', filters.subscriptionPackage);
      params.append('page', filters.page?.toString() || '1');
      params.append('limit', filters.limit?.toString() || '10');

      const response = await fetch(`/api/customers?${params}`);
      if (response.ok) {
        const data: CustomersResponse = await response.json();
        setCustomers(data.items);
        setPagination({
          page: data.page,
          total: data.total,
          totalPages: data.totalPages,
        });
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [filters]);

  const handleViewDetails = (customerId: string) => {
    router.push(`/app/customers/${customerId}`);
  };

  // Shortened package names for display
  const getShortPackageName = (packageName: SubscriptionPackage): string => {
    if (packageName.includes('Regular Cleaning')) return 'Regular (2x/week)';
    if (packageName.includes('Frequent Cleaning')) return 'Frequent (3x/week)';
    if (packageName.includes('Special Partnership')) return 'Special (1x/week)';
    if (packageName.includes('Basic Cleaning')) return 'Basic (1x/week)';
    return packageName;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search customers..."
              value={filters.q}
              onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value, page: 1 }))}
              className="input-field"
            />
          </div>
          <div>
            <select
              value={filters.acquisition || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, acquisition: e.target.value as AcquisitionType || undefined, page: 1 }))}
              className="input-field"
            >
              <option value="">All Acquisition</option>
              <option value="HOMA">HOMA</option>
              <option value="Altrix">Altrix</option>
            </select>
          </div>
          <div>
            <input
              type="text"
              placeholder="Filter by status..."
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
              className="input-field"
            />
          </div>
          <div>
            <select
              value={filters.churnTag || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, churnTag: e.target.value as ChurnTag || undefined, page: 1 }))}
              className="input-field"
            >
              <option value="">All Churn Tags</option>
              <option value="Internal">Internal</option>
              <option value="External">External</option>
              <option value="N/A">N/A</option>
            </select>
          </div>
          <div>
            <input
              type="text"
              placeholder="Filter by city..."
              value={filters.city}
              onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value, page: 1 }))}
              className="input-field"
            />
          </div>
          <div>
            <select
              value={filters.residentialType || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, residentialType: e.target.value as ResidentialType || undefined, page: 1 }))}
              className="input-field"
            >
              <option value="">All Types</option>
              <option value="House">House</option>
              <option value="Office Space">Office Space</option>
              <option value="Apartment">Apartment</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Dashboard - Showing 5 Key Fields as per PRD */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Customer Dashboard</h2>
            <span className="text-sm text-gray-500">
              {pagination.total} total customers
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Showing 5 key fields: CustomerName, QtyPackage, SubscriptionPackage, Status, ChurnTag
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center">
            <Icons.users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Customers Found</h3>
            <p className="text-gray-600">
              {filters.q || filters.acquisition || filters.status || filters.churnTag || filters.city || filters.residentialType
                ? 'Try adjusting your filters to see more results.'
                : 'Start by importing customers from trial conversions or add new customers.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty Package
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subscription Package
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Churn Tag
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-600 hover:text-blue-900 cursor-pointer"
                             onClick={() => handleViewDetails(customer.id)}>
                          {customer.customerName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {customer.qtyPackage}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={customer.subscriptionPackage}>
                          {getShortPackageName(customer.subscriptionPackage)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[customer.status] || 'bg-gray-100 text-gray-800'}`}>
                          {customer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${churnTagColors[customer.churnTag]}`}>
                          {customer.churnTag}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(customer.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((filters.page || 1) - 1) * (filters.limit || 10) + 1} to{' '}
                  {Math.min((filters.page || 1) * (filters.limit || 10), pagination.total)} of{' '}
                  {pagination.total} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, (prev.page || 1) - 1) }))}
                    disabled={(filters.page || 1) <= 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {filters.page || 1} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.totalPages, (prev.page || 1) + 1) }))}
                    disabled={(filters.page || 1) >= pagination.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Subscription List Sub-menu */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Subscription List</h3>
          <p className="mt-1 text-sm text-gray-600">
            Quick overview of subscription packages and customer distribution
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm font-medium text-blue-600">Regular Cleaning</div>
              <div className="text-2xl font-bold text-blue-900">
                {customers.filter(c => c.subscriptionPackage.includes('Regular Cleaning')).length}
              </div>
              <div className="text-xs text-blue-600">2 visits per week</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm font-medium text-green-600">Frequent Cleaning</div>
              <div className="text-2xl font-bold text-green-900">
                {customers.filter(c => c.subscriptionPackage.includes('Frequent Cleaning')).length}
              </div>
              <div className="text-xs text-green-600">3 visits per week</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm font-medium text-purple-600">Special Partnership</div>
              <div className="text-2xl font-bold text-purple-900">
                {customers.filter(c => c.subscriptionPackage.includes('Special Partnership')).length}
              </div>
              <div className="text-xs text-purple-600">1 visit per week</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-sm font-medium text-orange-600">Basic Cleaning</div>
              <div className="text-2xl font-bold text-orange-900">
                {customers.filter(c => c.subscriptionPackage.includes('Basic Cleaning')).length}
              </div>
              <div className="text-xs text-orange-600">1 visit per week</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}