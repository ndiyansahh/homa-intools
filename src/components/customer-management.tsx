'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const filterPopupRef = useRef<HTMLDivElement>(null);

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

  // Close filter popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterPopupRef.current && !filterPopupRef.current.contains(event.target as Node)) {
        setShowFilterPopup(false);
      }
    }

    if (showFilterPopup) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFilterPopup]);

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

  // Count active filters
  const activeFilterCount = [
    filters.status,
    filters.city,
    filters.subscriptionPackage,
  ].filter(Boolean).length;

  // Clear all filters
  const clearAllFilters = () => {
    setFilters(prev => ({
      ...prev,
      status: '',
      city: '',
      subscriptionPackage: undefined,
      page: 1,
    }));
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
        {/* Simplified Header */}
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Search Input */}
              <div className="relative flex-1 md:w-80">
                <Icons.search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={filters.q}
                  onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value, page: 1 }))}
                  className="input-field pl-10 w-full"
                />
              </div>

              {/* Filter Button with Popup */}
              <div className="relative" ref={filterPopupRef}>
                <button
                  onClick={() => setShowFilterPopup(!showFilterPopup)}
                  className={`inline-flex items-center px-4 py-2 border rounded-lg font-medium transition-all ${
                    activeFilterCount > 0
                      ? 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icons.filter className="w-4 h-4 mr-2" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Filter Popup */}
                {showFilterPopup && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Filter Customers</h3>
                        <button
                          onClick={() => setShowFilterPopup(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Icons.close className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Status Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Subscription Status
                        </label>
                        <select
                          value={filters.status}
                          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                          className="input-field w-full"
                        >
                          <option value="">All Status</option>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Suspended">Suspended</option>
                          <option value="Trial">Trial</option>
                          <option value="Expired">Expired</option>
                        </select>
                      </div>

                      {/* City Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          placeholder="Filter by city..."
                          value={filters.city}
                          onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value, page: 1 }))}
                          className="input-field w-full"
                        />
                      </div>

                      {/* Package Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Subscription Package
                        </label>
                        <input
                          type="text"
                          placeholder="Filter by package..."
                          value={filters.subscriptionPackage || ''}
                          onChange={(e) => setFilters(prev => ({ ...prev, subscriptionPackage: e.target.value || undefined, page: 1 }))}
                          className="input-field w-full"
                        />
                      </div>
                    </div>

                    <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex items-center justify-between">
                      <button
                        onClick={clearAllFilters}
                        className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                        disabled={activeFilterCount === 0}
                      >
                        Clear all
                      </button>
                      <button
                        onClick={() => setShowFilterPopup(false)}
                        className="btn-primary text-sm"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Add New Customer Button */}
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary inline-flex items-center justify-center whitespace-nowrap"
            >
              <Icons.plus className="w-4 h-4 mr-2" />
              Add New Customer
            </button>
          </div>

          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600 font-medium">Active filters:</span>
                {filters.status && (
                  <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    Status: {filters.status}
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, status: '', page: 1 }))}
                      className="ml-2 hover:text-blue-900"
                    >
                      <Icons.x className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.city && (
                  <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    City: {filters.city}
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, city: '', page: 1 }))}
                      className="ml-2 hover:text-blue-900"
                    >
                      <Icons.x className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.subscriptionPackage && (
                  <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    Package: {filters.subscriptionPackage}
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, subscriptionPackage: undefined, page: 1 }))}
                      className="ml-2 hover:text-blue-900"
                    >
                      <Icons.x className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Customer Table */}
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-semibold text-gray-900">Customer List</h2>
                  {refreshing && (
                    <div className="flex items-center text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      <span className="text-sm">Updating...</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="font-medium">{pagination.total} total customers</span>
                  <span className="text-gray-400">|</span>
                  <span className="text-green-600">{customers.filter(c => c.subscriptionStatus === 'Active').length} Active</span>
                  <span className="text-blue-600">{customers.filter(c => c.subscriptionStatus === 'Trial').length} Trial</span>
                  <span className="text-yellow-600">{customers.filter(c => c.subscriptionStatus === 'Suspended').length} Suspended</span>
                  <span className="text-gray-600">{customers.filter(c => c.subscriptionStatus === 'Inactive').length} Inactive</span>
                </div>
                {lastUpdated && (
                  <p className="text-xs text-gray-400 mt-2">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </p>
                )}
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