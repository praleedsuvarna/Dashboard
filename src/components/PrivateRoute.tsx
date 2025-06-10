import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuth();

  if (!isInitialized) {
    return null; // or a loading spinner
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

export default PrivateRoute; 