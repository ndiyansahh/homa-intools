'use client';

import React, { useState } from 'react';
import { Icons } from './icons';
import { TrialListItem, TrialStatus } from '@/types/trial';

interface UpdateTrialData {
  id: string;
  start_date?: string;
  end_date?: string;
  assigned_mitra?: string;
  subscription_status?: TrialStatus;
  notes?: string;
  subscription_package?: string;
  total_sessions?: number;
  chosen_days?: string[];
  qty_package?: number;
}

interface TrialDetailViewProps {
  trial: TrialListItem;
  editMode: string | null;
  setEditMode: (id: string | null) => void;
  onClose: () => void;
  handleUpdateTrial: (data: UpdateTrialData) => Promise<void>;
  convertToCustomer: (id: string) => Promise<void>;
  mitras: Array<{ id: string; name: string; phone: string }>;
  loadingMitras: boolean;
  fetchMitras: (date?: string) => Promise<void>;
  subscriptionPackages: Array<any>;
  loadingPackages: boolean;
  updateLoading: string | null;
  statusColors: { [key: string]: string };
  acquisitionColors: { [key: string]: string };
  residentialColors: { [key: string]: string };
}

export default function TrialDetailView({
  trial,
  editMode,
  setEditMode,
  onClose,
  handleUpdateTrial,
  convertToCustomer,
  mitras,
  loadingMitras,
  fetchMitras,
  subscriptionPackages,
  loadingPackages,
  updateLoading,
  statusColors,
  acquisitionColors,
  residentialColors,
}: TrialDetailViewProps) {
  const [showConversionForm, setShowConversionForm] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');

  // Check if this trial is in edit mode
  const isEditMode = editMode === trial.id;

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleSaveChanges = () => {
    // Save logic handled by parent
    setEditMode(null);
    setShowConversionForm(false);
  };

  const handleConvert = async () => {
    if (!selectedPackage || selectedDays.length === 0 || !startDate) {
      alert('Please fill in all required fields for conversion');
      return;
    }

    // Call parent's convert function with full data
    await convertToCustomer(trial.id);
    setShowConversionForm(false);
    setEditMode(null);
  };

  // Calculate visit preview
  const calculateVisitPreview = () => {
    if (!selectedPackage || selectedDays.length === 0) {
      return { totalSessions: 0, schedule: '', duration: '' };
    }

    const weeksInMonth = 4;
    const totalSessions = selectedDays.length * weeksInMonth * quantity;
    const schedule = `${selectedDays.join(', ')} (${selectedDays.length}x/week)`;
    const duration = `${quantity} month${quantity > 1 ? 's' : ''}`;

    return { totalSessions, schedule, duration };
  };

  const visitPreview = calculateVisitPreview();

  return (
    <tr className="bg-gray-50">
      <td colSpan={7} className="px-6 py-4">
        <div className="space-y-6">
          {/* Header with Edit and Convert Buttons */}
          <div className="flex items-center justify-between border-b border-gray-300 pb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {isEditMode
                ? (showConversionForm ? 'Convert Trial to Customer' : 'Edit Trial Details')
                : 'Trial Details'}
            </h3>
            <div className="flex items-center space-x-3">
              {isEditMode ? (
                <>
                  {showConversionForm ? (
                    <>
                      <button
                        onClick={handleConvert}
                        disabled={updateLoading === trial.id}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                      >
                        <Icons.check className="w-4 h-4 mr-2" />
                        Confirm Conversion
                      </button>
                      <button
                        onClick={() => setShowConversionForm(false)}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Back to Edit
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleSaveChanges}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Icons.check className="w-4 h-4 mr-2" />
                        Save Changes
                      </button>
                      {trial.overallStatus !== 'Converted' && (
                        <button
                          onClick={() => setShowConversionForm(true)}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                        >
                          <Icons.check className="w-4 h-4 mr-2" />
                          Convert to Customer
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditMode(null);
                          setShowConversionForm(false);
                        }}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditMode(trial.id)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Icons.edit className="w-4 h-4 mr-2" />
                    Edit
                  </button>
                  {trial.overallStatus !== 'Converted' && (
                    <button
                      onClick={() => {
                        setEditMode(trial.id);
                        setShowConversionForm(true);
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      <Icons.check className="w-4 h-4 mr-2" />
                      Convert to Customer
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Content */}
          {isEditMode ? (
            showConversionForm ? (
              /* Conversion Form */
              <div className="space-y-6">
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Icons.check className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        Converting <strong>{trial.customerName}</strong> from trial to active customer
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subscription Package *
                    </label>
                    <select
                      value={selectedPackage}
                      onChange={(e) => setSelectedPackage(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      disabled={loadingPackages}
                    >
                      <option value="">Select Package</option>
                      {subscriptionPackages.map((pkg) => (
                        <option key={pkg.id} value={pkg.subscriptionPackage}>
                          {pkg.subscriptionPackage} - Rp {parseInt(pkg.priceNumeric || 0).toLocaleString('id-ID')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (Months) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (e.target.value) {
                          fetchMitras(e.target.value);
                        }
                      }}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assigned Cleaner *
                    </label>
                    <select
                      defaultValue={trial.assignedMitraId || ''}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      disabled={loadingMitras || mitras.length === 0}
                      onChange={(e) => {
                        handleUpdateTrial({
                          id: trial.id,
                          assigned_mitra: e.target.value
                        });
                      }}
                    >
                      <option value="">Select Cleaner</option>
                      {mitras.map((mitra) => (
                        <option key={mitra.id} value={mitra.id}>
                          {mitra.name}
                        </option>
                      ))}
                    </select>
                    {loadingMitras && (
                      <div className="text-xs text-blue-500 mt-1">Checking cleaners availability...</div>
                    )}
                    {!loadingMitras && mitras.length === 0 && (
                      <div className="text-xs text-red-500 mt-1">No mitra available for selected date</div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Service Days *
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                        <label key={day} className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedDays.includes(day)}
                            onChange={() => handleDayToggle(day)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                          />
                          <span className="ml-2 text-sm text-gray-700">{day}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Select the days when cleaning service will be provided</p>
                  </div>

                  {selectedPackage && selectedDays.length > 0 && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📅 Visit Preview
                      </label>
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-indigo-500 rounded-md p-4">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600 font-medium">Total Sessions</p>
                            <p className="text-2xl font-bold text-indigo-600">{visitPreview.totalSessions} visits</p>
                          </div>
                          <div>
                            <p className="text-gray-600 font-medium">Schedule</p>
                            <p className="text-sm text-gray-900">{visitPreview.schedule}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 font-medium">Duration</p>
                            <p className="text-sm text-gray-900">{visitPreview.duration}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Edit Form - All Fields Editable */
              <div className="space-y-6">
                {/* Customer Information */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Customer Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Customer Name *
                      </label>
                      <input
                        type="text"
                        defaultValue={trial.customerName}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Acquisition Channel *
                      </label>
                      <select
                        defaultValue={trial.acquisition}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="HOMA">HOMA</option>
                        <option value="Altrix">Altrix</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        defaultValue={trial.city}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        District *
                      </label>
                      <input
                        type="text"
                        defaultValue={trial.district}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Residential Type *
                      </label>
                      <select
                        defaultValue={trial.residentialType}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="House">House</option>
                        <option value="Apartment">Apartment</option>
                        <option value="Office Space">Office Space</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Trial Schedule */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Trial Schedule</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        defaultValue={trial.nextTrialStartDate ? (() => {
                          const parts = trial.nextTrialStartDate.split('/');
                          return parts.length === 3 ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}` : '';
                        })() : ''}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        onChange={(e) => {
                          if (e.target.value) {
                            fetchMitras(e.target.value);
                            handleUpdateTrial({
                              id: trial.id,
                              start_date: e.target.value
                            });
                          }
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        defaultValue={trial.nextTrialEndDate ? (() => {
                          const parts = trial.nextTrialEndDate.split('/');
                          return parts.length === 3 ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}` : '';
                        })() : ''}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleUpdateTrial({
                              id: trial.id,
                              end_date: e.target.value
                            });
                          }
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Assigned Cleaner
                      </label>
                      <select
                        defaultValue={trial.assignedMitraId || ''}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={loadingMitras || mitras.length === 0}
                        onChange={(e) => {
                          handleUpdateTrial({
                            id: trial.id,
                            assigned_mitra: e.target.value
                          });
                        }}
                      >
                        <option value="">Select Cleaner</option>
                        {mitras.map((mitra) => (
                          <option key={mitra.id} value={mitra.id}>
                            {mitra.name}
                          </option>
                        ))}
                      </select>
                      {loadingMitras && (
                        <div className="text-xs text-blue-500 mt-1">Checking cleaners availability...</div>
                      )}
                      {!loadingMitras && mitras.length === 0 && (
                        <div className="text-xs text-red-500 mt-1">No mitra available</div>
                      )}
                      {!loadingMitras && mitras.length > 0 && (
                        <div className="text-xs text-green-500 mt-1">{mitras.length} mitra available</div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        defaultValue={trial.overallStatus || 'Not Converted'}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        onChange={(e) => {
                          handleUpdateTrial({
                            id: trial.id,
                            subscription_status: e.target.value as TrialStatus
                          });
                        }}
                      >
                        <option value="Not Converted">Not Converted</option>
                        <option value="Converted">Converted</option>
                        <option value="Stalling/Postpone">Stalling/Postpone</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>

                {updateLoading === trial.id && (
                  <div className="flex items-center justify-center text-sm text-gray-600 py-2">
                    <Icons.spinner className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </div>
                )}
              </div>
            )
          ) : (
            /* View Mode - Read Only */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                <div className="mt-1 text-sm text-gray-900">{trial.customerName}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Acquisition</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${acquisitionColors[trial.acquisition]}`}>
                    {trial.acquisition}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">City</label>
                <div className="mt-1 text-sm text-gray-900">{trial.city}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">District</label>
                <div className="mt-1 text-sm text-gray-900">{trial.district}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Residential Type</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${residentialColors[trial.residentialType]}`}>
                    {trial.residentialType}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  {trial.overallStatus ? (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[trial.overallStatus]}`}>
                      {trial.overallStatus}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500">-</span>
                  )}
                </div>
              </div>

              {trial.nextTrialStartDate && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <div className="mt-1 text-sm text-gray-900">{trial.nextTrialStartDate}</div>
                  </div>

                  {trial.nextTrialEndDate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">End Date</label>
                      <div className="mt-1 text-sm text-gray-900">{trial.nextTrialEndDate}</div>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Assigned Cleaner</label>
                <div className="mt-1 text-sm text-gray-900">
                  {trial.assignedCleaners.length > 0 ? trial.assignedCleaners.join(', ') : 'No cleaner assigned'}
                </div>
              </div>

              {trial.ltv !== undefined && trial.ltv > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">LTV (Lifetime Value)</label>
                  <div className="mt-1 text-sm font-medium text-blue-600">{trial.ltv} months</div>
                </div>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
