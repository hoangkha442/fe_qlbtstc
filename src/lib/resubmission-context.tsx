import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { StudentFields } from './types';

interface ResubmissionDraft {
  assignmentId: string;
  receiptCode: string;
  latestVersion: number;
  fields: StudentFields;
}
const ResubmissionContext = createContext<{
  draft?: ResubmissionDraft;
  prepare: (draft: ResubmissionDraft) => void;
  clear: () => void;
} | null>(null);

export function ResubmissionProvider({ children }: { children: ReactNode }) {
  // A receipt secret is handed between pages in memory, never in URLs or storage.
  const [draft, setDraft] = useState<ResubmissionDraft>();
  const prepare = useCallback((next: ResubmissionDraft) => setDraft(next), []);
  const clear = useCallback(() => setDraft(undefined), []);
  const value = useMemo(
    () => ({ draft, prepare, clear }),
    [draft, prepare, clear],
  );
  return (
    <ResubmissionContext.Provider value={value}>
      {children}
    </ResubmissionContext.Provider>
  );
}
export function useResubmission() {
  const context = useContext(ResubmissionContext);
  if (!context) throw new Error('ResubmissionProvider is required');
  return context;
}
