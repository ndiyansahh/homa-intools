'use client';

import { useState, useEffect } from 'react';
import { Icons } from './icons';

interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: any;
  newValue: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface AuditTrailProps {
  entityType?: 'mitra' | 'customer' | 'visit' | 'trial' | 'attendance';
  entityId?: string;
  limit?: number;
}

export default function AuditTrail({ entityType, entityId, limit = 20 }: AuditTrailProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditLogs();
  }, [entityType, entityId]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (entityType) params.append('entityType', entityType);
      if (entityId) params.append('entityId', entityId);
      params.append('limit', limit.toString());

      const response = await fetch(`/api/audit-log?${params.toString()}`);

      if (response.ok) {
        const data = await response.json();
        setLogs(data.data || []);
      } else {
        setError('Failed to load audit logs');
      }
    } catch (err) {
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'text-green-700 bg-green-100';
    if (action.includes('UPDATE')) return 'text-blue-700 bg-blue-100';
    if (action.includes('DELETE')) return 'text-red-700 bg-red-100';
    return 'text-gray-700 bg-gray-100';
  };

  const getEntityTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      mitra: 'bg-purple-100 text-purple-800',
      customer: 'bg-blue-100 text-blue-800',
      visit: 'bg-green-100 text-green-800',
      trial: 'bg-yellow-100 text-yellow-800',
      attendance: 'bg-indigo-100 text-indigo-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    }).format(date);
  };

  const renderChanges = (oldValue: any, newValue: any) => {
    if (!oldValue && !newValue) return null;

    const oldKeys = oldValue ? Object.keys(oldValue) : [];
    const newKeys = newValue ? Object.keys(newValue) : [];
    const allKeys = [...new Set([...oldKeys, ...newKeys])];

    if (allKeys.length === 0) return null;

    return (
      <div className="mt-2 space-y-1 text-xs">
        {allKeys.map((key) => (
          <div key={key} className="flex items-start gap-2">
            <span className="font-medium text-gray-600 min-w-[120px]">{key}:</span>
            <div className="flex-1">
              {oldValue && oldValue[key] !== undefined && (
                <div className="text-red-600">
                  <span className="font-mono bg-red-50 px-1 py-0.5 rounded">
                    {JSON.stringify(oldValue[key])}
                  </span>
                </div>
              )}
              {newValue && newValue[key] !== undefined && (
                <div className="text-green-600">
                  <span className="font-mono bg-green-50 px-1 py-0.5 rounded">
                    {JSON.stringify(newValue[key])}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icons.spinner className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading audit trail...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <Icons.close className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <Icons.clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No audit logs found</p>
        <p className="text-sm text-gray-500 mt-1">Changes will be tracked here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Audit Trail</h3>
        <button
          onClick={fetchAuditLogs}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <Icons.refresh className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {logs.map((log) => (
        <div
          key={log.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                  {log.action}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getEntityTypeColor(log.entityType)}`}>
                  {log.entityType}
                </span>
              </div>

              <div className="text-sm text-gray-700 mb-1">
                <span className="font-medium">{log.userEmail}</span> made changes
              </div>

              {renderChanges(log.oldValue, log.newValue)}

              <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Icons.clock className="w-3 h-3" />
                  {formatDate(log.createdAt)}
                </div>
                {log.ipAddress && (
                  <div className="flex items-center gap-1">
                    <span>IP:</span>
                    <span className="font-mono">{log.ipAddress}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
