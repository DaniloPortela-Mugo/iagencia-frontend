// ARQUIVO: client/src/components/ui/AuthGate.tsx
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const [location, setLocation] = useLocation();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const userSession = localStorage.getItem("user_session");

    if (!userSession) {
      setLocation("/login");
    } else {
      setIsAuthorized(true);
    }
  }, [setLocation]);

  if (!isAuthorized) {
    return null; 
  }

  return <>{children}</>;
}