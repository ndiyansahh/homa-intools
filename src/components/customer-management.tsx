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
        {/* Header with Stats and Action */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Icons.users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-gray-900">{pagination.total}</span>
                  {refreshing && (
                    <div className="flex items-center text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      <span className="text-sm">Updating...</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600">Total Customers</p>
                {lastUpdated && (
                  <p className="text-xs text-gray-400">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary inline-flex items-center justify-center"
          >
            <Icons.plus className="w-4 h-4 mr-2" />
            Add New Customer
          </button>
        </div>

        {/* Subscription Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white rounded-lg">
                <Icons.checkCircle className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-white px-2 py-1 rounded-full">Active</span>
            </div>
            <div className="text-2xl font-bold text-green-900">
              {customers.filter(c => c.subscriptionStatus === 'Active').length}
            </div>
            <div className="text-sm text-green-700 mt-1">Active subscriptions</div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white rounded-lg">
                <Icons.clockIcon className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-blue-600 bg-white px-2 py-1 rounded-full">Trial</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {customers.filter(c => c.subscriptionStatus === 'Trial').length}
            </div>
            <div className="text-sm text-blue-700 mt-1">Trial subscriptions</div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-5 border border-yellow-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white rounded-lg">
                <Icons.alertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <span className="text-xs font-medium text-yellow-600 bg-white px-2 py-1 rounded-full">Suspended</span>
            </div>
            <div className="text-2xl font-bold text-yellow-900">
              {customers.filter(c => c.subscriptionStatus === 'Suspended').length}
            </div>
            <div className="text-sm text-yellow-700 mt-1">Suspended accounts</div>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white rounded-lg">
                <Icons.xCircle className="w-5 h-5 text-gray-600" />
              </div>
              <span className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded-full">Inactive</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {customers.filter(c => c.subscriptionStatus === 'Inactive').length}
            </div>
            <div className="text-sm text-gray-700 mt-1">Inactive customers</div>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Icons.search className="w-5 h-5 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Search & Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Icons.search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={filters.q}
                onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value, page: 1 }))}
                className="input-field pl-10"
              />
            </div>
            <div className="relative">
              <Icons.filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                className="input-field pl-10"
              >
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
                <option value="Trial">Trial</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
            <div className="relative">
              <Icons.mapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Filter by city..."
                value={filters.city}
                onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value, page: 1 }))}
                className="input-field pl-10"
              />
            </div>
            <div className="relative">
              <Icons.package2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Filter by package..."
                value={filters.subscriptionPackage || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, subscriptionPackage: e.target.value || undefined, page: 1 }))}
                className="input-field pl-10"
              />
            </div>
          </div>
        </div>

        {/* Customer Table */}
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Customer List</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Manage and view all customer details
                </p>
              </div>
            </div>
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
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Invoice ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Package
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Monthly Fee
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {customers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="hover:bg-blue-50 transition-colors cursor-pointer"
                        onClick={() => handleViewDetails(customer.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">
                                {customer.customerName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-gray-900">
                                {customer.customerName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-700">
                            <Icons.mapPin className="w-4 h-4 mr-1 text-gray-400" />
                            {customer.city}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {customer.invoiceId ? (
                            <div className="text-sm text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded inline-block"
                              title={customer.invoiceId}>
                              {customer.invoiceId}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400">-</div>
                          )}
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <div className="text-sm text-gray-700 truncate" title={customer.subscriptionPackage}>
                            {customer.subscriptionPackage ?
                              (customer.subscriptionPackage.length > 30
                                ? customer.subscriptionPackage.substring(0, 30) + '...'
                                : customer.subscriptionPackage)
                              : <span className="text-gray-400">No package</span>
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusColors[customer.subscriptionStatus] || 'bg-gray-100 text-gray-800'}`}>
                            {customer.subscriptionStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            Rp {customer.monthlyFee?.toLocaleString('id-ID') || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(customer.id);
                            }}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            <Icons.eye className="w-4 h-4 mr-1" />
                            View
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
      </div>
    </>
  );
}