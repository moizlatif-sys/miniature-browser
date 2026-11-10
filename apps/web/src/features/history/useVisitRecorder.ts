'use client';

import { useCallback, useRef, useState } from 'react';
import { api, ApiError, type VisitInput } from '@/lib/api/client';

/**
 * Writes arrivals to the API after the page is already on screen.
 *
 * Each arrival gets its eventId once, when it happens. A failed write keeps
 * that same eventId in a queue for retry, and the API treats a repeated
 * eventId as the same visit, so retrying can never create duplicates.
 * A failure never touches the page being shown.
 */
export function useVisitRecorder(onRecorded: (personId: string) => void) {
  const [failed, setFailed] = useState<VisitInput[]>([]);
  const failedRef = useRef(failed);
  failedRef.current = failed;
  const onRecordedRef = useRef(onRecorded);
  onRecordedRef.current = onRecorded;

  const record = useCallback(async (visit: VisitInput) => {
    try {
      await api.recordVisit(visit);
      setFailed((list) => list.filter((v) => v.eventId !== visit.eventId));
      onRecordedRef.current(visit.personId);
    } catch (err) {
      // A 4xx means the request itself is wrong; retrying would not help.
      if (err instanceof ApiError && err.kind === 'http' && err.status < 500) return;
      setFailed((list) => [...list.filter((v) => v.eventId !== visit.eventId), visit]);
    }
  }, []);

  const retry = useCallback(() => {
    failedRef.current.forEach((v) => void record(v));
  }, [record]);

  return { record, unsaved: failed.length, retry };
}
