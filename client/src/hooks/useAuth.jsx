import { createContext, useContext, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { toast } = useToast();

  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [isAuthLoaded, setIsAuthLoaded] = useState(false);

  const { data } = useQuery({
    queryKey: ["api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!localStorage.getItem("token"),
  });

  useEffect(() => {
    if (data) {
      setUser(data);
    } else if (data === null && localStorage.getItem("token")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
    }
    setIsAuthLoaded(true);
  }, [data]);

  const loginMutation = useMutation({
    mutationFn: async (credentials) => {
      const result = await apiRequest("POST", "/api/auth/login", credentials);
      localStorage.setItem("token", result.token); 
      localStorage.setItem("user", JSON.stringify(result.user));
      setUser(result.user);
      return result.user;
    },
    onSuccess: (user) => queryClient.setQueryData(["api/auth/user"], user),
    onError: (error) =>
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      }),
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials) => {
      const result = await apiRequest("POST", "/api/auth/register", credentials);
      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));
      setUser(result.user);
      return result.user;
    },
    onSuccess: (user) => queryClient.setQueryData(["api/auth/user"], user),
    onError: (error) =>
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      }),
  });

  const logoutMutation = useMutation({
    mutationFn: async () =>  {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      queryClient.setQueryData(["api/auth/user"], null);
    },
    onSuccess: () => toast({
        title: "Logout successful",
        description: "You have been logged out",
        variant: "success",
      }),
    onError: (error) =>
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      }),
  });

  return (
    <AuthContext.Provider
      value={{ user, isAuthLoaded, loginMutation, registerMutation, logoutMutation }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
