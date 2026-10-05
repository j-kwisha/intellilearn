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
  const checkGuard = () => {
    if (!guardRef.current) return false;
    const result = guardRef.current();
    if (!result?.blocked) return false;
    return !window.confirm(result.message);
  };

  return (
    <NavigationGuardContext.Provider value={{ registerGuard, clearGuard, checkGuard }}>
      {children}
    </NavigationGuardContext.Provider>
  );
}
