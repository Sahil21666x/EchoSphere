import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export default function Sidebar({ currentView, onViewChange, onCreatePost }) {
  const { user, logoutMutation } = useAuth();
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [connected, setConnected] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Fetch connected accounts from backend
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/accounts`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          credentials: "include",
        });

        const data = await res.json();

        // data.accounts is an object, convert to array
        const accountsArray = Object.keys(data.accounts || {}).map((key) => ({
          provider: key,
          ...data.accounts[key],
        }));


        setConnectedAccounts(accountsArray);


        // Check if no accounts connected
        setConnected((data.summary?.connected || 0) === 0);
      } catch (error) {
        console.error("Failed to fetch accounts", error);
      }
    };
    fetchAccounts();
  }, []);

  // Handle connect account flow
  const handleConnect = async (provider) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/accounts/link/${provider}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          credentials: "include",
        }
      );
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // redirect to OAuth flow
      }
    } catch (error) {
      console.error(`Failed to connect ${provider}`, error);
    }
  };

  const handleDisconnect = async (provider) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/accounts/unlink/${provider}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        credentials: "include",
      });

      const data = await res.json();
      if (res.ok) {
        alert(`${provider} disconnected!`);
        // Refresh connected accounts
        setConnectedAccounts((prev) => prev.filter((acc) => acc.provider !== provider));
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error(`Failed to disconnect ${provider}`, error);
    }
  };


  const navItems = [
    { id: "dashboard", icon: "fas fa-chart-bar", label: "Dashboard" },
    { id: "ai-chat", icon: "fas fa-comments", label: "AI Assistant" },
    { id: "calendar", icon: "fas fa-calendar-alt", label: "Content Calendar" },
    { id: "posts", icon: "fas fa-file-alt", label: "Posts" },
  ];

  const getInitials = (firstName, lastName) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Logo & Branding */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <i className="fas fa-robot text-white"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">SocialAI</h1>
            <p className="text-xs text-muted-foreground">AI-Powered Social Media</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${currentView === item.id
              ? "bg-blue-50 text-blue-700"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            data-testid={`nav-${item.id}`}
          >
            <i className={`${item.icon} w-5`}></i>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Connected Accounts */}
      <div className="p-4 border-t border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Connected Accounts
        </h3>
        <div className="space-y-2">
          {connected ? (
            <p className="text-xs text-muted-foreground">
              No accounts connected yet
            </p>
          ) : (
            connectedAccounts.map((acc) => (
              <div
                key={acc.provider}
                className="flex items-center justify-between p-2 rounded-lg bg-secondary"
              >
                <div className="flex items-center space-x-2">
                  {acc.provider === "twitter" && (
                    <i className="fab fa-twitter text-blue-500"></i>
                  )}
                  {acc.provider === "linkedin" && (
                    <i className="fab fa-linkedin text-blue-700"></i>
                  )}
                  {acc.provider === "instagram" && (
                    <i className="fab fa-instagram text-pink-500"></i>
                  )}
                  <span className="text-sm text-foreground capitalize">
                    {acc.provider}
                  </span>
                </div>
                <div
                  className={`w-2 h-2 ${acc.connected ? 'bg-green-500' : 'bg-red-500'} bg-green-500 rounded-full`}
                  title="Connected"
                ></div>
                {
                  acc.connected && <button
                    className="text-xs text-red-500 hover:underline"
                    onClick={() => handleDisconnect(acc.provider)}
                  >
                    Disconnect
                  </button>
                }
              </div>
            ))
          )}
        </div>

        {/* Button to connect a new account */}
        <div className="flex flex-col gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleConnect("twitter")}
          >
            <i className="fab fa-twitter mr-2"></i> Connect Twitter
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleConnect("linkedin")}
          >
            <i className="fab fa-linkedin mr-2"></i> Connect LinkedIn
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleConnect("instagram")}
          >
            <i className="fab fa-instagram mr-2"></i> Connect Instagram
          </Button>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
            <span
              className="text-white text-sm font-semibold"
              data-testid="text-user-initials"
            >
              {getInitials(user?.firstName, user?.lastName)}
            </span>
          </div>
          <div className="flex-1">
            <p
              className="text-sm font-medium text-foreground"
              data-testid="text-user-name"
            >
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.username || "User"}
            </p>
            <p
              className="text-xs text-muted-foreground"
              data-testid="text-user-email"
            >
              {user?.email || "user@example.com"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-logout"
          >
            <i className="fas fa-sign-out-alt"></i>
          </Button>
        </div>
      </div>
    </div>
  );
}
