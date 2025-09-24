import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    businessType: ""
  });

  if (user) {
    return <Redirect to="/" />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLogin) {
      loginMutation.mutate({
        email: formData.username,
        password: formData.password
      });
    } else {
      registerMutation.mutate({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        businessType: formData.businessType
      });
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen flex">
      {/* Left Column - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-robot text-white text-xl"></i>
              </div>
            </div>
            <CardTitle className="text-2xl">
              {isLogin ? "Welcome Back" : "Create Account"}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? "Sign in to your SocialAI account" 
                : "Join SocialAI and start creating amazing content"
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" data-testid="label-firstName">First Name</Label>
                      <Input
                        id="firstName"
                        type="text"
                        name ="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        placeholder="John"
                        required={!isLogin}
                        data-testid="input-firstName"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" data-testid="label-lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        name ="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        placeholder="Doe"
                        required={!isLogin}
                        data-testid="input-lastName"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="email" data-testid="label-email">Email</Label>
                    <Input
                      id="email"
                      name ="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="john@example.com"
                      required={!isLogin}
                      data-testid="input-email"
                    />
                  </div>
                </>
              )}
              
              <div>
                <Label htmlFor="username" data-testid="label-username">
                  {isLogin ? "Username or Email" : "Username"}
                </Label>
                <Input
                  id="username"
                  name ="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange("username", e.target.value)}
                  placeholder={isLogin ? "Enter username or email" : "Choose a username"}
                  required
                  data-testid="input-username"
                />
              </div>
              
              <div>
                <Label htmlFor="password" data-testid="label-password">Password</Label>
                <Input
                  id="password"
                  name ="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  placeholder={isLogin ? "Enter your password" : "Create a secure password"}
                  required
                  data-testid="input-password"
                />
              </div>
              
              {!isLogin && (
                <div>
                  <Label htmlFor="businessType" data-testid="label-businessType">Business Type</Label>
                  <Select 
                    value={formData.businessType} 
                    name="businessType"
                    onValueChange={(value) => handleInputChange("businessType", value)}
                  >
                    <SelectTrigger data-testid="select-businessType">
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small-business">Small Business</SelectItem>
                      <SelectItem value="freelancer">Freelancer</SelectItem>
                      <SelectItem value="marketing-agency">Marketing Agency</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                data-testid="button-submit"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <button 
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-blue-600 hover:underline"
                  data-testid="button-toggle-mode"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Right Column - Hero Section */}
      <div className="flex-1 bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-8 text-white">
        <div className="max-w-lg text-center">
          <h1 className="text-4xl font-bold mb-6">
            AI-Powered Social Media Management
          </h1>
          <p className="text-xl mb-8 text-blue-100">
            Generate engaging content, schedule posts across platforms, and grow your social media presence with the power of artificial intelligence.
          </p>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-robot text-2xl"></i>
              </div>
              <h3 className="font-semibold mb-2">AI Content Generation</h3>
              <p className="text-sm text-blue-100">Create engaging posts with AI assistance</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-calendar-alt text-2xl"></i>
              </div>
              <h3 className="font-semibold mb-2">Smart Scheduling</h3>
              <p className="text-sm text-blue-100">Schedule content for optimal engagement</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-chart-line text-2xl"></i>
              </div>
              <h3 className="font-semibold mb-2">Analytics</h3>
              <p className="text-sm text-blue-100">Track performance across platforms</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}