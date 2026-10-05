import { createContext, useContext } from 'react';

export const NavigationGuardContext = createContext(null);

export const useNavigationGuard = () => useContext(NavigationGuardContext);
