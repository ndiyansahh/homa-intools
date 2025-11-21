'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SessionData } from '@/types/auth';
import { CustomerListItem, CustomersResponse, CustomerFilters } from '@/types/customer';
import { Icons } from './icons';
import CustomerForm from './customer-form';

interface CustomerManagementProps {
  session: SessionData;
}

const statusColors: { [key: string]: string } = {
  'Active': 'bg-green-100 text-green-800',
  'Inactive': 'bg-red-100 text-red-800',
  'Suspended': 'bg-yellow-100 text-yellow-800',
  'Trial': 'bg-blue-100 text-blue-800',
  'Expired': 'bg-gray-100 text-gray-800',
};

export default function CustomerManagement({ session }: CustomerManagementProps) {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Filter state
  const [filters, setFilters] = useState<CustomerFilters>({
    q: '',
    status: '',
    city: '',
    subscriptionPackage: undefined,
    page: 1,
    limit: 10,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  });

  const fetchCustomers = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams();
      if (filters.q) params.append('q', filters.q);
      if (filters.status) params.append('status', filters.status);
      if (filters.city) params.append('city', filters.city);
      if (filters.subscriptionPackage) params.append('subscriptionPackage', filters.subscriptionPackage);
      params.append('page', filters.page?.toString() || '1');
      params.append('limit', filters.limit?.toString() || '10');

      // Add cache-busting parameter for real-time updates
      params.append('_t', Date.now().toString());

      const response = await fetch(`/api/customers?${params}`);
      if (response.ok) {
        const data: CustomersResponse = await response.json();
        setCustomers(data.items);
        setPagination({
          page: data.page,
          total: data.total,
          totalPages: data.totalPages,
        });
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [filters]);

  // Auto-refresh every 30 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !refreshing) {
        fetchCustomers(true);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [filters, loading, refreshing]);

  const handleViewDetails = (customerId: string) => {
    router.push(`/app/customers/${customerId}`);
  };


  const handleFormSuccess = () => {
    fetchCustomers(); // Refresh customer list
  };

  return (
    <>
      {showForm && (
        <CustomerForm
          session={session}
          onClose={() => setShowForm(false)}
          onSuccess={handleFormSuccess}
        />
      )}
      
      <div className="space-y-6">
        {/* Add Customer Button */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Customer Database</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage customer subscriptions and track customer lifecycle
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <Icons.plus className="w-4 h-4 mr-2" />
            Add New Customer
          </button>
        </div>

        {/* Filters */}
        <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
              className="input-field"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended</option>
              <option value="Trial">Trial</option>
              <option value="Expired">Expired</option>
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
            <input
              type="text"
              placeholder="Filter by package..."
              value={filters.subscriptionPackage || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, subscriptionPackage: e.target.value || undefined, page: 1 }))}
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Customer Dashboard - Showing 5 Key Fields as per PRD */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-900">Customer Dashboard</h2>
              {refreshing && (
                <div className="flex items-center text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-sm">Updating...</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => fetchCustomers(true)}
                disabled={refreshing}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                title="Refresh data"
              >
                🔄 Refresh
              </button>
              <div className="text-right">
                <span className="text-sm text-gray-500">
                  {pagination.total} total customers
                </span>
                {lastUpdated && (
                  <div className="text-xs text-gray-400">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Customer overview with subscription details and location
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
              {filters.q || filters.status || filters.city || filters.subscriptionPackage
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
                      City
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subscription Package
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monthly Fee
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
                          {customer.city}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={customer.subscriptionPackage}>
                          {customer.subscriptionPackage ? customer.subscriptionPackage.substring(0, 30) + '...' : 'No package'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[customer.subscriptionStatus] || 'bg-gray-100 text-gray-800'}`}>
                          {customer.subscriptionStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          Rp {customer.monthlyFee?.toLocaleString('id-ID') || 0}
                        </div>
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

      {/* Subscription Summary */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Subscription Summary</h3>
          <p className="mt-1 text-sm text-gray-600">
            Overview of customer distribution by status
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm font-medium text-green-600">Active</div>
              <div className="text-2xl font-bold text-green-900">
                {customers.filter(c => c.subscriptionStatus === 'Active').length}
              </div>
              <div className="text-xs text-green-600">Active subscriptions</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-sm font-medium text-red-600">Inactive</div>
              <div className="text-2xl font-bold text-red-900">
                {customers.filter(c => c.subscriptionStatus === 'Inactive').length}
              </div>
              <div className="text-xs text-red-600">Inactive customers</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-sm font-medium text-yellow-600">Suspended</div>
              <div className="text-2xl font-bold text-yellow-900">
                {customers.filter(c => c.subscriptionStatus === 'Suspended').length}
              </div>
              <div className="text-xs text-yellow-600">Suspended accounts</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm font-medium text-blue-600">Trial</div>
              <div className="text-2xl font-bold text-blue-900">
                {customers.filter(c => c.subscriptionStatus === 'Trial').length}
              </div>
              <div className="text-xs text-blue-600">Trial subscriptions</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}