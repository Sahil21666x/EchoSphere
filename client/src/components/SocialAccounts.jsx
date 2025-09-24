
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function SocialAccounts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: accountsData, isLoading } = useQuery({
    queryKey: ["/api/accounts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/accounts");
      return response.json();
    }
  });

  const connectMutation = useMutation({
    mutationFn: async (platform) => {
      window.location.href = `/api/accounts/${platform}/connect`;
    },
    onError: (error) => {
      toast({
        title: "Connection Error",
        description: `Failed to connect to ${platform}`,
        variant: "destructive"
      });
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async (platform) => {
      const response = await apiRequest("DELETE", `/api/accounts/${platform}`);
      if (!response.ok) {
        throw new Error(`Failed to disconnect ${platform}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `${data.platform} account disconnected successfully`
      });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (platform) => {
      const response = await apiRequest("POST", `/api/accounts/${platform}/test`);
      if (!response.ok) {
        throw new Error(`Connection test failed for ${platform}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Connection Valid",
        description: `${data.platform} connection is working properly`
      });
    },
    onError: (error) => {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const accounts = accountsData?.accounts || {};
  const platforms = [
    {
      id: "twitter",
      name: "Twitter",
      icon: "fab fa-twitter",
      color: "text-blue-500",
      bgColor: "bg-blue-50"
    },
    {
      id: "linkedin", 
      name: "LinkedIn",
      icon: "fab fa-linkedin",
      color: "text-blue-700",
      bgColor: "bg-blue-50"
    },
    {
      id: "instagram",
      name: "Instagram", 
      icon: "fab fa-instagram",
      color: "text-pink-500",
      bgColor: "bg-pink-50"
    }
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Accounts</CardTitle>
        <p className="text-sm text-muted-foreground">
          Connect your social media accounts to start posting content
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {platforms.map((platform) => {
          const account = accounts[platform.id] || {};
          const isConnected = account.connected || false;
          const isValid = account.isValid || false;

          return (
            <div
              key={platform.id}
              className={`border rounded-lg p-4 ${platform.bgColor} border-gray-200`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                    <i className={`${platform.icon} ${platform.color} text-xl`}></i>
                  </div>
                  <div>
                    <h3 className="font-medium">{platform.name}</h3>
                    {isConnected && account.username && (
                      <p className="text-sm text-muted-foreground">
                        @{account.username}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {isConnected ? (
                    <>
                      <Badge 
                        variant={isValid ? "default" : "destructive"}
                        className={isValid ? "bg-green-100 text-green-800" : ""}
                      >
                        {isValid ? "Connected" : "Invalid"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testConnectionMutation.mutate(platform.id)}
                        disabled={testConnectionMutation.isPending}
                      >
                        {testConnectionMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <i className="fas fa-check"></i>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => disconnectMutation.mutate(platform.id)}
                        disabled={disconnectMutation.isPending}
                      >
                        {disconnectMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Disconnect"
                        )}
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => connectMutation.mutate(platform.id)}
                      disabled={connectMutation.isPending}
                    >
                      {connectMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Connect
                    </Button>
                  )}
                </div>
              </div>
              
              {isConnected && (
                <div className="mt-3 text-sm text-muted-foreground">
                  <p>Connected {account.connectedAt && new Date(account.connectedAt).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          );
        })}

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <i className="fas fa-exclamation-triangle text-yellow-600"></i>
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> Keep your accounts connected for automated posting. 
              Test connections regularly to ensure posts are published successfully.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
