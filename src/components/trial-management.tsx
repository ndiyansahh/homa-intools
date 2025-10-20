'use client';

import { useState, useEffect } from 'react';
import { SessionData } from '@/types/auth';
import { TrialListItem, TrialsResponse, TrialStatus, CreateTrialRequest, TrialFilters, AcquisitionType, ResidentialType } from '@/types/trial';
import { Icons } from './icons';
import TrialDetailView from './trial-detail';

interface TrialManagementProps {
  session: SessionData;
}

const statusColors = {
  'Converted': 'bg-green-100 text-green-800',
  'Not Converted': 'bg-red-100 text-red-800',
  'Stalling/Postpone': 'bg-yellow-100 text-yellow-800',
  'Cancelled': 'bg-gray-100 text-gray-800',
};

const acquisitionColors = {
  'HOMA': 'bg-blue-100 text-blue-800',
  'Altrix': 'bg-purple-100 text-purple-800',
};

const residentialColors = {
  'House': 'bg-green-100 text-green-800',
  'Office Space': 'bg-orange-100 text-orange-800',
  'Apartment': 'bg-indigo-100 text-indigo-800',
};

// Helper functions untuk konversi format tanggal
const convertToDateInputFormat = (ddmmyyyy: string): string => {
  if (!ddmmyyyy || ddmmyyyy.length !== 10) return '';
  const [day, month, year] = ddmmyyyy.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const convertFromDateInputFormat = (yyyymmdd: string): string => {
  if (!yyyymmdd) return '';
  const [year, month, day] = yyyymmdd.split('-');
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
};

export default function TrialManagement({ session }: TrialManagementProps) {
  const [trials, setTrials] = useState<TrialListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedTrial, setSelectedTrial] = useState<string | null>(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateTrialRequest>({
    customerName: '',
    acquisition: 'HOMA',
    address: '',
    district: '',
    city: '',
    village: '',
    postalCode: '',
    residentialType: 'House',
    assignments: [{
      trialStart: '',
      trialEnd: '',
      assignedCleaner: '',
      status: 'Not Converted',
    }],
    notes: '',
  });

  // Filter state
  const [filters, setFilters] = useState<TrialFilters>({
    q: '',
    status: undefined,
    cleaner: '',
    acquisition: undefined,
    city: '',
    residentialType: undefined,
    page: 1,
    limit: 10,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  });

  // Available cleaners list (matching customer API)
  const availableCleaners = ['Ardi', 'Inem', 'Siti', 'Budi', 'Ani', 'Dewi', 'Rina', 'Tono', 'Wati', 'Didi', 'Maya', 'Joko'];

  const fetchTrials = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.q) params.append('q', filters.q);
      if (filters.status) params.append('status', filters.status);
      if (filters.cleaner) params.append('cleaner', filters.cleaner);
      if (filters.acquisition) params.append('acquisition', filters.acquisition);
      if (filters.city) params.append('city', filters.city);
      if (filters.residentialType) params.append('residentialType', filters.residentialType);
      params.append('page', filters.page?.toString() || '1');
      params.append('limit', filters.limit?.toString() || '10');

      const response = await fetch(`/api/trials?${params}`);
      if (response.ok) {
        const result = await response.json();
        
        // Handle new API response format
        if (result.success && result.data) {
          setTrials(result.data);
          setPagination({
            page: result.page || result.pagination?.page || 1,
            total: result.total || result.pagination?.total || 0,
            totalPages: result.totalPages || result.pagination?.totalPages || 0,
          });
        } else {
          // Fallback for old format
          const data: TrialsResponse = result;
          setTrials(data.items);
          setPagination({
            page: data.page,
            total: data.total,
            totalPages: data.totalPages,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching trials:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrials();
  }, [filters]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;

    try {
      setCreating(true);
      
      // Filter out empty assignments
      const validAssignments = formData.assignments.filter(assignment => 
        assignment.trialStart.trim() && assignment.assignedCleaner.trim()
      );

      if (validAssignments.length === 0) {
        alert('Please add at least one trial assignment');
        return;
      }

      const response = await fetch('/api/trials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          assignments: validAssignments,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Reset form
          setFormData({
            customerName: '',
            acquisition: 'HOMA',
            address: '',
            district: '',
            city: '',
            village: '',
            postalCode: '',
            residentialType: 'House',
            assignments: [{
              trialStart: '',
              trialEnd: '',
              assignedCleaner: '',
              status: 'Not Converted',
            }],
            notes: '',
          });
          setShowForm(false);
          fetchTrials();
        } else {
          alert(result.message || 'Failed to create trial');
        }
      } else {
        const errorResult = await response.json().catch(() => ({}));
        alert(errorResult.message || errorResult.error || 'Failed to create trial');
      }
    } catch (error) {
      console.error('Error creating trial:', error);
      alert('Failed to create trial');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trial?')) return;

    try {
      const response = await fetch(`/api/trials/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchTrials();
      } else {
        alert('Failed to delete trial');
      }
    } catch (error) {
      console.error('Error deleting trial:', error);
      alert('Failed to delete trial');
    }
  };

  const addAssignment = () => {
    setFormData(prev => ({
      ...prev,
      assignments: [...prev.assignments, {
        trialStart: '',
        trialEnd: '',
        assignedCleaner: '',
        status: 'Not Converted',
      }]
    }));
  };

  const updateAssignment = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      assignments: prev.assignments.map((assignment, i) => 
        i === index ? { ...assignment, [field]: value } : assignment
      )
    }));
  };

  const removeAssignment = (index: number) => {
    if (formData.assignments.length > 1) {
      setFormData(prev => ({
        ...prev,
        assignments: prev.assignments.filter((_, i) => i !== index)
      }));
    }
  };

  return (
    <>
      {selectedTrial && (
        <TrialDetailView
          trialId={selectedTrial}
          onClose={() => setSelectedTrial(null)}
        />
      )}
      
    <div className="space-y-6">
      {/* Create Trial Form */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Create New Trial</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            <Icons.plus className="w-4 h-4 mr-2" />
            {showForm ? 'Cancel' : 'New Trial'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Customer Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.customerName}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                  className="input-field"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Acquisition *
                </label>
                <select
                  value={formData.acquisition}
                  onChange={(e) => setFormData(prev => ({ ...prev, acquisition: e.target.value as AcquisitionType }))}
                  className="input-field"
                  required
                >
                  <option value="HOMA">HOMA</option>
                  <option value="Altrix">Altrix</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  className="input-field"
                  placeholder="Tangerang, Jakarta, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Village
                </label>
                <input
                  type="text"
                  value={formData.village || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, village: e.target.value }))}
                  className="input-field"
                  placeholder="Kelurahan/Desa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postal Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.postalCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                  className="input-field"
                  placeholder="15148"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Residential Type *
                </label>
                <select
                  value={formData.residentialType}
                  onChange={(e) => setFormData(prev => ({ ...prev, residentialType: e.target.value as ResidentialType }))}
                  className="input-field"
                  required
                >
                  <option value="House">House</option>
                  <option value="Office Space">Office Space</option>
                  <option value="Apartment">Apartment</option>
                </select>
              </div>
            </div>

            {/* Address Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="input-field"
                  placeholder="1 Park Residences"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  District *
                </label>
                <input
                  type="text"
                  required
                  value={formData.district}
                  onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                  className="input-field"
                  placeholder="Jl Greenlake"
                />
              </div>
            </div>

            {/* Trial Assignments - Infinite as per PRD */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Trial Assignments * (Start with 1 date + 1 cleaner, can be added infinitely)
                </label>
                <button
                  type="button"
                  onClick={addAssignment}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Add Assignment
                </button>
              </div>
              <div className="space-y-4">
                {formData.assignments.map((assignment, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-900">Assignment #{index + 1}</h4>
                      {formData.assignments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAssignment(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Icons.trash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Trial Start *
                        </label>
                        <input
                          type="date"
                          required
                          value={assignment.trialStart ? convertToDateInputFormat(assignment.trialStart) : ''}
                          onChange={(e) => updateAssignment(index, 'trialStart', convertFromDateInputFormat(e.target.value))}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Trial End
                        </label>
                        <input
                          type="date"
                          value={assignment.trialEnd ? convertToDateInputFormat(assignment.trialEnd) : ''}
                          onChange={(e) => updateAssignment(index, 'trialEnd', convertFromDateInputFormat(e.target.value))}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Assigned Cleaner *
                        </label>
                        <select
                          required
                          value={assignment.assignedCleaner}
                          onChange={(e) => updateAssignment(index, 'assignedCleaner', e.target.value)}
                          className="input-field"
                        >
                          <option value="">Select cleaner</option>
                          {availableCleaners.map((cleaner) => (
                            <option key={cleaner} value={cleaner}>{cleaner}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status per Assignment
                        </label>
                        <select
                          value={assignment.status || 'Not Converted'}
                          onChange={(e) => updateAssignment(index, 'status', e.target.value)}
                          className="input-field"
                        >
                          <option value="Not Converted">Not Converted</option>
                          <option value="Converted">Converted</option>
                          <option value="Stalling/Postpone">Stalling/Postpone</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                    {(assignment.status === 'Not Converted' || assignment.status === 'Stalling/Postpone' || assignment.status === 'Cancelled') && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Reason for Not Converting
                        </label>
                        <input
                          type="text"
                          value={assignment.reasonForNotConverting || ''}
                          onChange={(e) => updateAssignment(index, 'reasonForNotConverting', e.target.value)}
                          className="input-field"
                          placeholder="Schedule conflict, price too high, etc."
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="input-field"
                placeholder="Additional notes about the customer and trial..."
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
                {creating ? 'Creating...' : 'Create Trial'}
              </button>
            </div>
          </form>
        )}
      </div>

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
          <div>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as TrialStatus || undefined, page: 1 }))}
              className="input-field"
            >
              <option value="">All Statuses</option>
              <option value="Converted">Converted</option>
              <option value="Not Converted">Not Converted</option>
              <option value="Stalling/Postpone">Stalling/Postpone</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <input
              type="text"
              placeholder="Filter by cleaner..."
              value={filters.cleaner}
              onChange={(e) => setFilters(prev => ({ ...prev, cleaner: e.target.value, page: 1 }))}
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Trials List */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Trials</h2>
            <span className="text-sm text-gray-500">
              {pagination.total} total trials
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading trials...</p>
          </div>
        ) : trials.length === 0 ? (
          <div className="p-8 text-center">
            <Icons.beaker className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Trials Found</h3>
            <p className="text-gray-600">
              {filters.q || filters.status || filters.cleaner
                ? 'Try adjusting your filters to see more results.'
                : 'Get started by creating your first trial.'}
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
                      Acquisition
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      District
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      City
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Residential Type
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
                  {trials.map((trial) => (
                    <tr
                      key={trial.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedTrial(selectedTrial === trial.id ? null : trial.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-600 hover:text-blue-900">
                          {trial.customerName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {trial.assignedCleaners.length > 0 ? trial.assignedCleaners.join(', ') : 'No cleaner assigned'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${acquisitionColors[trial.acquisition]}`}>
                          {trial.acquisition}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {trial.district}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {trial.city}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${residentialColors[trial.residentialType]}`}>
                          {trial.residentialType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {trial.overallStatus ? (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[trial.overallStatus]}`}>
                            {trial.overallStatus}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                        {trial.nextTrialStartDate && (
                          <div className="text-xs text-gray-500 mt-1">
                            Start: {trial.nextTrialStartDate}
                            {trial.nextTrialEndDate && ` - End: ${trial.nextTrialEndDate}`}
                          </div>
                        )}
                        {trial.ltv !== undefined && (
                          <div className="text-xs text-blue-600 mt-1">
                            LTV: {trial.ltv} months
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(trial.id);
                          }}
                          className="text-red-600 hover:text-red-900 ml-4"
                        >
                          <Icons.trash className="w-4 h-4" />
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