import { useRef } from 'react';

// Holds a callback that returns true if navigation should be blocked.
// Components like StudentQuizPage register a guard; DashboardLayout checks it.
import { NavigationGuardContext } from './NavigationGuardContextStore';

export function NavigationGuardProvider({ children }) {
  // guardRef.current = function that returns { blocked: bool, message: string } | null
  const guardRef = useRef(null);

  const registerGuard = (fn) => { guardRef.current = fn; };
  const clearGuard   = ()   => { guardRef.current = null; };

  // Returns true if navigation was blocked (caller should abort), false if OK to proceed
  const checkGuard = async () => {
    if (!guardRef.current) return false;
    const result = guardRef.current();
    if (!result?.blocked) return false;
    if (!window.confirm(result.message)) return true;
    try {
      await result.onProceed?.();
      return false;
    } catch (error) {
      window.alert(error?.response?.data?.message || 'Could not lock your attempt. Please stay on this page and try again.');
      return true;
    }
  };

  return (
    <NavigationGuardContext.Provider value={{ registerGuard, clearGuard, checkGuard }}>
      {children}
    </NavigationGuardContext.Provider>
  );
}
