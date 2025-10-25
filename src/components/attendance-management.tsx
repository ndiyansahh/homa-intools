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
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  });

  // Update form state
  const [updateForm, setUpdateForm] = useState({
    clientName: '',
    address: '',
    package: '',
    startDate: '',
    endDate: '',
    newEndDate: '',
    cleaner1: '',
    cleaner2: '',
  });

  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('q', searchTerm);
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
  }, [searchTerm, page]);

  const handleUpdateClick = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setUpdateForm({
      clientName: record.clientName,
      address: record.address,
      package: record.package,
      startDate: record.startDate,
      endDate: record.endDate,
      newEndDate: record.newEndDate || '',
      cleaner1: record.cleaner1,
      cleaner2: record.cleaner2,
    });
    setShowUpdateModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedRecord) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/attendance/${selectedRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateForm),
      });

      if (response.ok) {
        alert('Attendance record updated successfully');
        setShowUpdateModal(false);
        setSelectedRecord(null);
        fetchAttendanceRecords();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update attendance record');
      }
    } catch (error) {
      console.error('Error updating attendance record:', error);
      alert('Failed to update attendance record');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Filter */}
      <div className="card p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by client name, address, or cleaner..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
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
            <h2 className="text-xl font-semibold text-gray-900">Attendance Records</h2>
            <span className="text-sm text-gray-500">
              {pagination.total} total records
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Showing data from AttendanceRecordDB with update functionality
          </p>
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
              {searchTerm
                ? 'Try adjusting your search to see more results.'
                : 'No attendance records have been created yet.'}
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
                      Client Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Package
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cleaners
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendanceRecords.map((record, index) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {index + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {record.clientName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={record.address}>
                          {record.address}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={record.package}>
                          {record.package}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div>Start: {record.startDate}</div>
                          <div>End: {record.endDate}</div>
                          {record.newEndDate && (
                            <div className="text-blue-600">New: {record.newEndDate}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {record.cleaner1}
                            </span>
                            {record.cleaner2 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {record.cleaner2}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleUpdateClick(record)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Update
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

      {/* Update Modal */}
      {showUpdateModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Attendance Record</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={updateForm.clientName}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, clientName: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Package
                  </label>
                  <input
                    type="text"
                    value={updateForm.package}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, package: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={updateForm.address}
                  onChange={(e) => setUpdateForm(prev => ({ ...prev, address: e.target.value }))}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date (dd/MM/yyyy)
                  </label>
                  <input
                    type="text"
                    value={updateForm.startDate}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, startDate: e.target.value }))}
                    placeholder="25/12/2025"
                    pattern="\d{2}/\d{2}/\d{4}"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date (dd/MM/yyyy)
                  </label>
                  <input
                    type="text"
                    value={updateForm.endDate}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, endDate: e.target.value }))}
                    placeholder="25/12/2025"
                    pattern="\d{2}/\d{2}/\d{4}"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New End Date (dd/MM/yyyy)
                  </label>
                  <input
                    type="text"
                    value={updateForm.newEndDate}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, newEndDate: e.target.value }))}
                    placeholder="30/12/2025"
                    pattern="\d{2}/\d{2}/\d{4}"
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cleaner 1
                  </label>
                  <input
                    type="text"
                    value={updateForm.cleaner1}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, cleaner1: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cleaner 2
                  </label>
                  <input
                    type="text"
                    value={updateForm.cleaner2}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, cleaner2: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowUpdateModal(false);
                  setSelectedRecord(null);
                }}
                className="btn-secondary"
                disabled={updating}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="btn-primary"
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Update Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}