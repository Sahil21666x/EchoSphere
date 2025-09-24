import { useAuth } from "../hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({ component: Component, path }) {
  const { user, isAuthLoaded } = useAuth();

  if (!isAuthLoaded) return null; // wait until auth check completes
  if (!user) return <Redirect to="/auth" />;

  return <Route path={path} component={Component} />;
}