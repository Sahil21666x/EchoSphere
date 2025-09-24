import { Route, Redirect } from "wouter";
import { useAuth } from "@/hooks/useAuth";

import { Loader2 } from "lucide-react";


export function PublicRoute({ path, component: Component }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (user) {
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  return <Component />
}
