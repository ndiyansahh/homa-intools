'use client';

import { useState, useEffect } from 'react';
import { MitraData } from '@/types/mitra';
import { Icons } from './icons';

interface MitraDetailProps {
  mitraId: string;
  onClose: () => void;
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

const bonusColors = {
  'Eligible': 'bg-green-100 text-green-800',
  'Not Eligible': 'bg-red-100 text-red-800',
};

export default function MitraDetailView({ mitraId, onClose }: MitraDetailProps) {
  const [mitra, setMitra] = useState<MitraData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMitra = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/mitra/${mitraId}`);
        
        if (response.ok) {
          const data = await response.json();
          setMitra(data);
        } else {
          setError('Failed to load mitra details');
        }
      } catch (err) {
        setError('Failed to load mitra details');
      } finally {
        setLoading(false);
      }
    };

    fetchMitra();
  }, [mitraId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-center text-gray-600">Loading mitra details...</p>
        </div>
      </div>
    );
  }

  if (error || !mitra) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="text-center">
            <Icons.close className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Mitra</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button onClick={onClose} className="btn-primary">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Mitra Details</h2>
            <p className="text-sm text-gray-600">Partner: {mitra.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icons.close className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <div className="mt-1 text-sm text-gray-900">{mitra.name}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">NIK</label>
                  <div className="mt-1 text-sm text-gray-900">{mitra.nik}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gender</label>
                  <div className="mt-1 text-sm text-gray-900">{mitra.gender}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Born Date</label>
                  <div className="mt-1 text-sm text-gray-900">{mitra.bornDate}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <div className="mt-1 text-sm text-gray-900">{mitra.phone}</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Partnership Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mitra Code</label>
                  <div className="mt-1 text-sm font-mono text-gray-900">{mitra.mitraCode}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Join Date</label>
                  <div className="mt-1 text-sm text-gray-900">{mitra.joinDate}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Partnership Type</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${partnershipColors[mitra.partnershipTypes]}`}>
                      {mitra.partnershipTypes}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[mitra.status]}`}>
                      {mitra.status}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tenure</label>
                  <div className="mt-1 text-sm text-gray-900">{mitra.tenure} months</div>
                </div>
                {mitra.exitDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Exit Date</label>
                    <div className="mt-1 text-sm text-gray-900">{mitra.exitDate}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Address & Assignment</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <div className="mt-1 text-sm text-gray-900">{mitra.address}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">City Assignment</label>
                  <div className="mt-1 text-sm text-gray-900">{mitra.cityAssignment}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location Assignment</label>
                  <div className="mt-1 text-sm text-gray-900">{mitra.locationAssignment}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Banking Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Banking Information</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bank</label>
                  <div className="mt-1 text-sm text-gray-900">{mitra.bankAccount}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Account Number</label>
                  <div className="mt-1 text-sm font-mono text-gray-900">{mitra.bankAccountNumber}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Account Holder</label>
                  <div className="mt-1 text-sm text-gray-900">{mitra.bankHoldersName}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bonus & Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Bonus Status</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${bonusColors[mitra.bonus]}`}>
                  {mitra.bonus}
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Timeline</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <div className="text-sm text-gray-900">
                    {new Date(mitra.createdAt).toLocaleString('en-GB', {
                      timeZone: 'Asia/Jakarta',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                  <div className="text-sm text-gray-900">
                    {new Date(mitra.updatedAt).toLocaleString('en-GB', {
                      timeZone: 'Asia/Jakarta',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}