'use client';

import { useState, useEffect } from 'react';
import { SessionData } from '@/types/auth';
import { AttendanceRecord, AttendanceResponse } from '@/types/customer';
import { Icons } from './icons';

interface AttendanceManagementProps {
  session: SessionData;
}

export default function AttendanceManagement({ session }: AttendanceManagementProps) {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCustomerName, setFilterCustomerName] = useState('');
  const [filterPackage, setFilterPackage] = useState('');
  const [filterMitraName, setFilterMitraName] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  });

  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterCustomerName) params.append('customerName', filterCustomerName);
      if (filterPackage) params.append('package', filterPackage);
      if (filterMitraName) params.append('mitraName', filterMitraName);
      if (filterFromDate) params.append('fromDate', filterFromDate);
      if (filterToDate) params.append('toDate', filterToDate);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await fetch(`/api/attendance?${params}`);
      if (response.ok) {
        const data: AttendanceResponse = await response.json();
        setAttendanceRecords(data.items);
        setPagination({
          page: data.page,
          total: data.total,
          totalPages: data.totalPages,
        });
      }
    } catch (error) {
      console.error('Error fetching attendance records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceRecords();
  }, [filterCustomerName, filterPackage, filterMitraName, filterFromDate, filterToDate, page]);

  return (
    <div className="space-y-6">
      {/* Search Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name
            </label>
            <input
              type="text"
              placeholder="Search by customer name..."
              value={filterCustomerName}
              onChange={(e) => {
                setFilterCustomerName(e.target.value);
                setPage(1);
              }}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subscription Package
            </label>
            <select
              value={filterPackage}
              onChange={(e) => {
                setFilterPackage(e.target.value);
                setPage(1);
              }}
              className="input-field"
            >
              <option value="">All Packages</option>
              <option value="Monthly Subscription of Special Partnership">Special Partnership (1x/week)</option>
              <option value="Monthly Subscription of Basic Cleaning">Basic Cleaning (1x/week)</option>
              <option value="Monthly Subscription of Regular Cleaning">Regular Cleaning (2x/week)</option>
              <option value="Monthly Subscription of Frequent Cleaning">Frequent Cleaning (3x/week)</option>
              <option value="Trial">Trial</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mitra Name
            </label>
            <input
              type="text"
              placeholder="Search by mitra name..."
              value={filterMitraName}
              onChange={(e) => {
                setFilterMitraName(e.target.value);
                setPage(1);
              }}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filterFromDate}
              onChange={(e) => {
                setFilterFromDate(e.target.value);
                setPage(1);
              }}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filterToDate}
              onChange={(e) => {
                setFilterToDate(e.target.value);
                setPage(1);
              }}
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Attendance Records List */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Attendance Records</h2>
              <p className="mt-1 text-sm text-gray-600">
                Showing visit records with customer and mitra information
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500">
                {pagination.total} total records
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading attendance records...</p>
          </div>
        ) : attendanceRecords.length === 0 ? (
          <div className="p-8 text-center">
            <Icons.clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Records Found</h3>
            <p className="text-gray-600">
              {filterCustomerName || filterPackage || filterMitraName || filterFromDate || filterToDate
                ? 'Try adjusting your filters to see more results.'
                : 'No visit records have been created yet.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mitra Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subscription Package
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visit Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visit Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendanceRecords.map((record, index) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {record.no || (index + 1)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-900 font-mono">
                          {(record as any).invoiceId || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {(record as any).customerName || record.clientName || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {(record as any).mitraName || 'Not assigned'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={(record as any).subscriptionPackage || record.package}>
                          {(record as any).subscriptionPackage || record.package || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          (record as any).visitStatus === 'Done' ? 'bg-green-100 text-green-800' :
                          (record as any).visitStatus === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                          (record as any).visitStatus === 'Cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {(record as any).visitStatus || record.status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {(record as any).scheduledDate || (record as any).actualDate || 'N/A'}
                        </div>
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
                  Showing {((page - 1) * limit) + 1} to{' '}
                  {Math.min(page * limit, pagination.total)} of{' '}
                  {pagination.total} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                    disabled={page >= pagination.totalPages}
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
  );
}