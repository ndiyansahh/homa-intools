'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface BreadcrumbOverride {
  // Map of URL path → label override
  // e.g. { '/app/customers/uuid': 'handi trial convert' }
  [path: string]: string;
}

interface BreadcrumbContextValue {
  overrides: BreadcrumbOverride;
  setOverride: (path: string, label: string) => void;
  clearOverride: (path: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  overrides: {},
  setOverride: () => {},
  clearOverride: () => {},
});

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<BreadcrumbOverride>({});

  const setOverride = useCallback((path: string, label: string) => {
    setOverrides(prev => ({ ...prev, [path]: label }));
  }, []);

  const clearOverride = useCallback((path: string) => {
    setOverrides(prev => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ overrides, setOverride, clearOverride }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbOverride() {
  return useContext(BreadcrumbContext);
}
