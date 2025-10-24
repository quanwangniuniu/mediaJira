import { createContext, useContext, useState, ReactNode } from 'react';

const ReportContext = createContext<{
  reportId: string | null;
  setReportId: (id: string) => void;
} | null>(null);

export function ReportProvider({ children }: { children: ReactNode }) {
  const [reportId, setReportId] = useState<string | null>(null);

  return (
    <ReportContext.Provider value={{ reportId, setReportId }}>
      {children}
    </ReportContext.Provider>
  );
}

export function useReportContext() {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error('useReportContext must be used within a ReportProvider');
  }
  return context;
}
