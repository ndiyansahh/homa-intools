'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';

interface Package {
  id: string;
  subscriptionPackage: string;
  pricePerQty: string;
  priceNumeric: number;
  visitsPerWeek: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function PackageManagementPage() {
  const router = useRouter();
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
      const response = await fetch('/api/packages');
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
      alert('Please fill in all fields');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      alert('Please enter a valid price (cannot be negative)');
      return;
    }

    try {
      setSaving(true);

      const url = editingPackage ? `/api/packages/${editingPackage.id}` : '/api/packages';
      const method = editingPackage ? 'PUT' : 'POST';

      // Combine package name with frequency if not already included
      let finalPackageName = packageName.trim();
      const freqPattern = /\d+x\/week|\d+x per week/i;
      if (!freqPattern.test(finalPackageName)) {
        finalPackageName = `${finalPackageName} ${visitsPerWeek}x/week`;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageName: finalPackageName,
          price: priceNum,
        }),
      });

      if (response.ok) {
        alert(editingPackage ? 'Package updated successfully' : 'Package created successfully');
        resetForm();
        await fetchPackages();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to save package');
      }
    } catch (error) {
      console.error('Error saving package:', error);
      alert('Failed to save package');
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
    if (!confirm(`Are you sure you want to delete "${pkg.subscriptionPackage}"?\n\nThis cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(pkg.id);
      const response = await fetch(`/api/packages/${pkg.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Package deleted successfully');
        await fetchPackages();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete package');
      }
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('Failed to delete package');
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
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Packages</h1>
          <p className="text-sm text-gray-500 mt-1">Manage customer pricing plans</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddForm(!showAddForm);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Icons.plus className="w-4 h-4 mr-2" />
          {showAddForm ? 'Cancel' : 'Add Package'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="card p-6 mb-6 bg-blue-50 border-blue-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingPackage ? 'Edit Package' : 'Add New Package'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Package Name *
                </label>
                <input
                  type="text"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  placeholder="e.g., Premium, Enterprise, Weekly 2x"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tip: Include visit frequency in name (e.g., "Basic 2x/week")
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Price (Rp) *
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g., 500000"
                  min="0"
                  step="1000"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
                {price && !isNaN(parseFloat(price)) && (
                  <p className="text-xs text-green-600 mt-1">
                    Display: Rp {parseFloat(price).toLocaleString('id-ID')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visits per Week *
                </label>
                <select
                  value={visitsPerWeek}
                  onChange={(e) => setVisitsPerWeek(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="1">1x per week</option>
                  <option value="2">2x per week</option>
                  <option value="3">3x per week</option>
                  <option value="4">4x per week</option>
                  <option value="5">5x per week</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  This will be appended to package name if not already included
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Icons.spinner className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
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
      )}

      {/* Packages List */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Active Packages ({packages.length})
          </h2>
        </div>

        {packages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Icons.beaker className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm">No packages found. Create your first package to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Package Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monthly Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visits/Week
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {packages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {pkg.subscriptionPackage}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{pkg.pricePerQty}</div>
                      <div className="text-xs text-gray-500">
                        Rp {pkg.priceNumeric.toLocaleString('id-ID')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {pkg.visitsPerWeek}x/week
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(pkg.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(pkg)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        <Icons.edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(pkg)}
                        disabled={deleting === pkg.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {deleting === pkg.id ? (
                          <Icons.spinner className="w-4 h-4 animate-spin" />
                        ) : (
                          <Icons.trash className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <Icons.alert className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Package Management Tips</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Include visit frequency in package name for clarity (e.g., "Regular 3x/week")</li>
                <li>Packages are used when creating customers and converting trial customers</li>
                <li>You cannot delete packages that are currently assigned to customers</li>
                <li>Price changes only affect new subscriptions, not existing customers</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
