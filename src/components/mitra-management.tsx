'use client';

import { useState, useEffect } from 'react';
import { SessionData } from '@/types/auth';
import { MitraListItem, MitraResponse, MitraStatus, CreateMitraRequest, MitraFilters, MitraPartnershipType } from '@/types/mitra';
import { Icons } from './icons';
import MitraDetailView from './mitra-detail';

interface MitraManagementProps {
  session: SessionData;
}

const statusColors = {
  'ACTIVE': 'bg-green-100 text-green-800',
  'EXIT': 'bg-red-100 text-red-800',
  'ACTIVE-FLAG': 'bg-yellow-100 text-yellow-800',
  'BANNED': 'bg-gray-100 text-gray-800',
};

const partnershipColors = {
  'Fulltime': 'bg-blue-100 text-blue-800',
  'Partime': 'bg-purple-100 text-purple-800',
};

export default function MitraManagement({ session }: MitraManagementProps) {
  const [mitras, setMitras] = useState<MitraListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedMitra, setSelectedMitra] = useState<string | null>(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateMitraRequest>({
    name: '',
    nik: '',
    gender: 'Pria',
    bornDate: '',
    address: '',
    phone: '',
    bankAccount: '',
    bankAccountNumber: '',
    bankHoldersName: '',
    cityAssignment: '',
    locationAssignment: '',
    partnershipTypes: 'Fulltime',
    status: 'ACTIVE',
    tenure: '3',
    bonus: 'Not Eligible',
  });

  // Filter state
  const [filters, setFilters] = useState<MitraFilters>({
    q: '',
    status: undefined,
    partnershipType: undefined,
    city: '',
    page: 1,
    limit: 10,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  });

  const fetchMitras = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.q) params.append('q', filters.q);
      if (filters.status) params.append('status', filters.status);
      if (filters.partnershipType) params.append('partnershipType', filters.partnershipType);
      if (filters.city) params.append('city', filters.city);
      params.append('page', filters.page?.toString() || '1');
      params.append('limit', filters.limit?.toString() || '10');

      const response = await fetch(`/api/mitra?${params}`);
      if (response.ok) {
        const data: MitraResponse = await response.json();
        setMitras(data.items);
        setPagination({
          page: data.page,
          total: data.total,
          totalPages: data.totalPages,
        });
      }
    } catch (error) {
      console.error('Error fetching mitras:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMitras();
  }, [filters]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;

    try {
      setCreating(true);
      const response = await fetch('/api/mitra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Reset form
        setFormData({
          name: '',
          nik: '',
          gender: 'Pria',
          bornDate: '',
          address: '',
          phone: '',
          bankAccount: '',
          bankAccountNumber: '',
          bankHoldersName: '',
          cityAssignment: '',
          locationAssignment: '',
          partnershipTypes: 'Fulltime',
          status: 'ACTIVE',
          tenure: '3',
          bonus: 'Not Eligible',
        });
        setShowForm(false);
        fetchMitras();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create mitra');
      }
    } catch (error) {
      console.error('Error creating mitra:', error);
      alert('Failed to create mitra');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mitra?')) return;

    try {
      const response = await fetch(`/api/mitra/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchMitras();
      } else {
        alert('Failed to delete mitra');
      }
    } catch (error) {
      console.error('Error deleting mitra:', error);
      alert('Failed to delete mitra');
    }
  };

  return (
    <>
      {selectedMitra && (
        <MitraDetailView
          mitraId={selectedMitra}
          onClose={() => setSelectedMitra(null)}
        />
      )}
      
    <div className="space-y-6">
      {/* Create Mitra Form */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Create New Mitra</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            <Icons.plus className="w-4 h-4 mr-2" />
            {showForm ? 'Cancel' : 'New Mitra'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                  placeholder="Enter full name"
                />
              </div>

              {/* NIK */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NIK *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nik}
                  onChange={(e) => setFormData(prev => ({ ...prev, nik: e.target.value }))}
                  className="input-field"
                  placeholder="16 digit NIK"
                  maxLength={16}
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender *
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as 'Pria' | 'Wanita' }))}
                  className="input-field"
                  required
                >
                  <option value="Pria">Pria</option>
                  <option value="Wanita">Wanita</option>
                </select>
              </div>

              {/* Born Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Born Date * (dd/MM/yyyy)
                </label>
                <input
                  type="text"
                  required
                  value={formData.bornDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, bornDate: e.target.value }))}
                  placeholder="25/12/1990"
                  pattern="\d{2}/\d{2}/\d{4}"
                  className="input-field"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="input-field"
                  placeholder="6281234567890"
                />
              </div>

              {/* Bank Account */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Account *
                </label>
                <input
                  type="text"
                  required
                  value={formData.bankAccount}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankAccount: e.target.value }))}
                  className="input-field"
                  placeholder="BCA, Mandiri, BNI, etc."
                />
              </div>

              {/* Bank Account Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Account Number *
                </label>
                <input
                  type="text"
                  required
                  value={formData.bankAccountNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
                  className="input-field"
                  placeholder="Account number"
                />
              </div>

              {/* Bank Holder Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Holder Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.bankHoldersName}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankHoldersName: e.target.value }))}
                  className="input-field"
                  placeholder="Name on bank account"
                />
              </div>

              {/* City Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City Assignment *
                </label>
                <input
                  type="text"
                  required
                  value={formData.cityAssignment}
                  onChange={(e) => setFormData(prev => ({ ...prev, cityAssignment: e.target.value }))}
                  className="input-field"
                  placeholder="Jakarta"
                />
              </div>

              {/* Location Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location Assignment *
                </label>
                <input
                  type="text"
                  required
                  value={formData.locationAssignment}
                  onChange={(e) => setFormData(prev => ({ ...prev, locationAssignment: e.target.value }))}
                  className="input-field"
                  placeholder="Jakarta Barat"
                />
              </div>

              {/* Partnership Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Partnership Type *
                </label>
                <select
                  value={formData.partnershipTypes}
                  onChange={(e) => setFormData(prev => ({ ...prev, partnershipTypes: e.target.value as MitraPartnershipType }))}
                  className="input-field"
                  required
                >
                  <option value="Fulltime">Fulltime</option>
                  <option value="Partime">Partime</option>
                </select>
              </div>

              {/* Tenure */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tenure (months) *
                </label>
                <select
                  value={formData.tenure}
                  onChange={(e) => setFormData(prev => ({ ...prev, tenure: e.target.value as '3' | '6' | '12' }))}
                  className="input-field"
                  required
                >
                  <option value="3">3 months</option>
                  <option value="6">6 months</option>
                  <option value="12">12 months</option>
                </select>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address *
              </label>
              <textarea
                required
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                rows={2}
                className="input-field"
                placeholder="Complete address..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="btn-primary"
              >
                {creating ? 'Creating...' : 'Create Mitra'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search mitras..."
              value={filters.q}
              onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value, page: 1 }))}
              className="input-field"
            />
          </div>
          <div>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as MitraStatus || undefined, page: 1 }))}
              className="input-field"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="EXIT">Exit</option>
              <option value="ACTIVE-FLAG">Active-Flag</option>
              <option value="BANNED">Banned</option>
            </select>
          </div>
          <div>
            <select
              value={filters.partnershipType || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, partnershipType: e.target.value as MitraPartnershipType || undefined, page: 1 }))}
              className="input-field"
            >
              <option value="">All Partnership</option>
              <option value="Fulltime">Fulltime</option>
              <option value="Partime">Partime</option>
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
        </div>
      </div>

      {/* Mitra List */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Mitra Partners</h2>
            <span className="text-sm text-gray-500">
              {pagination.total} total partners
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading mitras...</p>
          </div>
        ) : mitras.length === 0 ? (
          <div className="p-8 text-center">
            <Icons.users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Mitras Found</h3>
            <p className="text-gray-600">
              {filters.q || filters.status || filters.partnershipType || filters.city
                ? 'Try adjusting your filters to see more results.'
                : 'Get started by creating your first mitra partner.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Partner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code / NIK
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assignment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mitras.map((mitra) => (
                    <tr
                      key={mitra.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedMitra(selectedMitra === mitra.id ? null : mitra.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {mitra.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            Joined {mitra.joinDate}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {mitra.mitraCode}
                        </div>
                        <div className="text-xs text-gray-500">
                          NIK: {mitra.nik}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {mitra.phone}
                        </div>
                        <div className="text-xs text-gray-500">
                          {mitra.bankAccount} - {mitra.bankAccountNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {mitra.locationAssignment}
                        </div>
                        <div className="flex gap-1 mt-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${partnershipColors[mitra.partnershipTypes]}`}>
                            {mitra.partnershipTypes}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[mitra.status]}`}>
                          {mitra.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {(['ADMIN', 'OWNER'].includes(session.role)) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(mitra.id);
                            }}
                            className="text-red-600 hover:text-red-900 ml-4"
                          >
                            <Icons.trash className="w-4 h-4" />
                          </button>
                        )}
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