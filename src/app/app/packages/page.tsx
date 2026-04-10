'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';
import { useToast } from '@/lib/toast';
import { useConfirm } from '@/components/confirm-dialog';

interface Package {
  id: string;
  subscriptionPackage: string;
  pricePerQty: string;
  priceNumeric: number;
  visitsPerWeek: number;
  activeCustomers: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function PackageManagementPage() {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);

  // Form states
  const [packageName, setPackageName] = useState('');
  const [price, setPrice] = useState('');
  const [visitsPerWeek, setVisitsPerWeek] = useState('1'); // Default 1x per week
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/packages', { cache: 'no-store' });
      if (response.ok) {
        const result = await response.json();
        setPackages(result.data || []);
      } else {
        console.error('Failed to fetch packages');
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!packageName.trim() || !price.trim()) {
      toast('warning', 'Please fill in all fields');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      toast('warning', 'Please enter a valid price (cannot be negative)');
      return;
    }

    try {
      setSaving(true);

      const url = editingPackage ? `/api/packages/${editingPackage.id}` : '/api/packages';
      const method = editingPackage ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageName: packageName.trim(),
          price: priceNum,
          visitsPerWeek: parseInt(visitsPerWeek), // Bug #4 fix: Send frequency to API
        }),
      });

      if (response.ok) {
        toast('success', editingPackage ? 'Package updated successfully' : 'Package created successfully');
        resetForm();
        await fetchPackages();
      } else {
        const error = await response.json();
        toast('error', error.message || 'Failed to save package');
      }
    } catch (error) {
      console.error('Error saving package:', error);
      toast('error', 'Failed to save package');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (pkg: Package) => {
    setEditingPackage(pkg);
    setPackageName(pkg.subscriptionPackage);
    setPrice(pkg.priceNumeric.toString());
    setVisitsPerWeek(pkg.visitsPerWeek?.toString() || '1');
    setShowAddForm(true);
  };

  const handleDelete = async (pkg: Package) => {
    if (pkg.activeCustomers > 0) {
      toast('error', `Cannot delete — ${pkg.activeCustomers} active customer(s) are using this package.`);
      return;
    }

    const ok = await confirm({
      title: 'Delete Package',
      message: `Delete "${pkg.subscriptionPackage}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;

    try {
      setDeleting(pkg.id);
      const response = await fetch(`/api/packages/${pkg.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast('success', 'Package deleted successfully');
        await fetchPackages();
      } else {
        const error = await response.json();
        toast('error', error.message || 'Failed to delete package');
      }
    } catch (error) {
      console.error('Error deleting package:', error);
      toast('error', 'Failed to delete package');
    } finally {
      setDeleting(null);
    }
  };

  const resetForm = () => {
    setPackageName('');
    setPrice('');
    setVisitsPerWeek('1');
    setEditingPackage(null);
    setShowAddForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Icons.spinner className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Subscription Packages</h1>
              <p className="text-gray-600 mt-2">Manage customer pricing plans and visit frequencies</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowAddForm(!showAddForm);
              }}
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              <Icons.plus className="w-5 h-5 mr-2" />
              {showAddForm ? 'Cancel' : 'Add New Package'}
            </button>
          </div>
        </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {editingPackage ? 'Edit Package Details' : 'Create New Package'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Icons.close className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Package Name *
                  </label>
                  <input
                    type="text"
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                    placeholder="e.g., Premium, Enterprise, Weekly 2x"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2 flex items-center">
                    <Icons.alert className="w-3 h-3 mr-1" />
                    Tip: Include visit frequency in name (e.g., "Basic 2x/week")
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Monthly Price (Rp) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 text-sm">Rp</span>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="e.g., 500000"
                      min="0"
                      step="1000"
                      className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      required
                    />
                  </div>
                  {price && !isNaN(parseFloat(price)) && (
                    <p className="text-xs font-medium text-green-600 mt-2 bg-green-50 px-2 py-1 rounded-md inline-block">
                      Display: Rp {parseFloat(price).toLocaleString('id-ID')}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Visits per Week *
                  </label>
                  <select
                    value={visitsPerWeek}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      setVisitsPerWeek(newVal);

                      // Auto-sync package name if it contains a frequency pattern
                      const freqPattern = /\d+x\/week|\d+\s*visits?\s*per\s*week/i;
                      const newFreq = newVal === '0' ? '0x/week' : `${newVal}x/week`;

                      if (freqPattern.test(packageName)) {
                        setPackageName(packageName.replace(freqPattern, newFreq));
                      } else if (packageName.trim() !== '') {
                        setPackageName(`${packageName.trim()} ${newFreq}`);
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236B7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1rem' }}
                    required
                  >
                    <option value="0">0x per week (Trial)</option>
                    <option value="1">1x per week</option>
                    <option value="2">2x per week</option>
                    <option value="3">3x per week</option>
                    <option value="4">4x per week</option>
                    <option value="5">5x per week</option>
                    <option value="6">6x per week</option>
                    <option value="7">7x per week</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    Expected monthly visits vary based on calendar. This frequency is used for payout calculations.
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                  {saving ? (
                    <>
                      <Icons.spinner className="w-4 h-4 mr-2 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Icons.check className="w-4 h-4 mr-2" />
                      {editingPackage ? 'Update Package' : 'Create Package'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        {/* Packages Grid */}
        {packages.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Icons.beaker className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No packages yet</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Create your first subscription package to start offering cleaning services to customers
            </p>
            <button
              onClick={() => {
                resetForm();
                setShowAddForm(true);
              }}
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
            >
              <Icons.plus className="w-5 h-5 mr-2" />
              Create First Package
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-indigo-200 transition-all duration-200"
                >
                  {/* Card Header */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
                        {pkg.subscriptionPackage}
                      </h3>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 ml-2 flex-shrink-0">
                        {pkg.visitsPerWeek}x/week
                      </span>
                    </div>
                    <div className="mt-4">
                      <p className="text-3xl font-bold text-gray-900">{pkg.pricePerQty}</p>
                      <p className="text-sm text-gray-500 mt-1">per month</p>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 bg-gray-50">
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Icons.calendar className="w-4 h-4 mr-3 text-gray-400" />
                        <span>Created {new Date(pkg.createdAt).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Icons.currency className="w-4 h-4 mr-3 text-gray-400" />
                        <span>Rp {pkg.priceNumeric.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icons.users className="w-4 h-4 text-gray-400 shrink-0" />
                        {pkg.activeCustomers > 0 ? (
                          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {pkg.activeCustomers} active customer{pkg.activeCustomers > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No active customers</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="p-4 bg-white border-t border-gray-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEdit(pkg)}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      <Icons.edit className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(pkg)}
                      disabled={deleting === pkg.id || pkg.activeCustomers > 0}
                      title={pkg.activeCustomers > 0 ? `${pkg.activeCustomers} active customer(s) are using this package` : undefined}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {deleting === pkg.id ? (
                        <>
                          <Icons.spinner className="w-4 h-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Icons.trash className="w-4 h-4 mr-2" />
                          Delete
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Icons.alert className="h-6 w-6 text-blue-500" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-base font-semibold text-blue-900 mb-3">Package Management Tips</h3>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li className="flex items-start">
                      <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mr-3 mt-1.5 flex-shrink-0"></span>
                      <span>Include visit frequency in package name for clarity (e.g., "Regular 3x/week")</span>
                    </li>
                    <li className="flex items-start">
                      <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mr-3 mt-1.5 flex-shrink-0"></span>
                      <span>Packages are used when creating customers and converting trial customers</span>
                    </li>
                    <li className="flex items-start">
                      <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mr-3 mt-1.5 flex-shrink-0"></span>
                      <span>You cannot delete packages that are currently assigned to customers</span>
                    </li>
                    <li className="flex items-start">
                      <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mr-3 mt-1.5 flex-shrink-0"></span>
                      <span>Price changes only affect new subscriptions, not existing customers</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
