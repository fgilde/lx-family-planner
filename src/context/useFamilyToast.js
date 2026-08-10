import { useCallback, useEffect, useRef, useState } from 'react';

/** Keeps short-lived UI feedback out of the persistent family-data provider. */
export function useFamilyToast(timeoutMs = 4200) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((title, message, type = 'info') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ title, message, type });
    timerRef.current = setTimeout(() => setToast(null), timeoutMs);
  }, [timeoutMs]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { toast, setToast, showToast };
}
