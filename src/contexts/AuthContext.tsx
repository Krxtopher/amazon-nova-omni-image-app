import { createContext, useContext } from 'react';

interface AuthContextType {
  signOut?: () => void;
  userEmail?: string;
}

const AuthContext = createContext<AuthContextType>({});

export const AuthProvider = AuthContext.Provider;
export const useAuth = () => useContext(AuthContext);
