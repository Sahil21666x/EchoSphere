import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function AiChat({ onSchedulePost }) {
  const {user} = useAuth();
  
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm your AI assistant. I can help you create engaging social media content. What kind of post would you like to create today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateContentMutation = useMutation({
    mutationFn: async (prompt) => {
      const res = await apiRequest("POST", `/api/conversations`, {
        message: prompt,
        platforms: ["twitter", "linkedin", "instagram"],
        tone: "professional",
        includeHashtags: true,
        businessContext: user?.businessInfo || {},
        contentType: "post"
      });
      return await res;
    },
    onSuccess: (data) => {
      const assistantMessage = {
        role: "assistant",
        content: "Here are some social media posts I've generated for you:",
        timestamp: new Date().toISOString(),
        generatedContent: data.content
      };
      setMessages(prev => [...prev, assistantMessage]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate content",
        variant: "destructive"
      });
      
      const errorMessage = {
        role: "assistant",
        content: "Sorry, I encountered an error while generating content. Please try again.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  });

  const savePostMutation = useMutation({
    mutationFn: async (postData) => {
      const res = await apiRequest("POST", "/api/posts", postData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post saved as draft successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save post",
        variant: "destructive"
      });
    }
  });

  const handleSendMessage = async () => {
    if (!inputValue.trim() || generateContentMutation.isPending) return;

    const userMessage = {
      role: "user",
      content: inputValue,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");

    generateContentMutation.mutate(inputValue);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSaveToDrafts = (content) => {
    savePostMutation.mutate({
      content: content.content,
      platforms: [content.platform],
      status: "draft",
      aiGenerated: true
    });
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Hi! I'm your AI assistant. I can help you create engaging social media content. What kind of post would you like to create today?",
        timestamp: new Date().toISOString()
      }
    ]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getPlatformIcon = (platform) => {
    switch (platform.toLowerCase()) {
      case "twitter": return "fab fa-twitter text-blue-500";
      case "linkedin": return "fab fa-linkedin text-blue-700";
      case "instagram": return "fab fa-instagram text-pink-500";
      default: return "fas fa-share-alt text-gray-500";
    }
  };

  const getPlatformColor = (platform) => {
    switch (platform.toLowerCase()) {
      case "twitter": return "bg-blue-50 border-blue-200";
      case "linkedin": return "bg-blue-50 border-blue-200";
      case "instagram": return "bg-pink-50 border-pink-200";
      default: return "bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="h-[600px] flex flex-col">
        {/* Chat Header */}
  <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-robot text-white"></i>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">AI Assistant</h2>
                <p className="text-sm text-muted-foreground">Generate engaging social media content</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-sm text-muted-foreground">Online</span>
            </div>
          </div>
        </CardHeader>

        {/* Chat Messages */}
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex items-start space-x-3 ${
              message.role === "user" ? "justify-end" : ""
            }`}>
              {message.role === "assistant" && (
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <i className="fas fa-robot text-white text-sm"></i>
                </div>
              )}
              
              <div className={`flex-1 ${message.role === "user" ? "flex justify-end" : ""}`}>
                <div className={`rounded-lg p-4 max-w-md ${
                  message.role === "user" 
                    ? "bg-blue-600 text-white" 
                    : "bg-purple-50"
                }`}>
                  <p className="text-sm">{message.content}</p>
                  
                  {/* Display generated content */}
                  {message.generatedContent && (
                    <div className="mt-4 space-y-3">
                      {message.generatedContent.map((content, contentIndex) => (
                        <div 
                          key={contentIndex} 
                          className={`bg-white rounded-lg p-3 border-2 ${getPlatformColor(content.platform)}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <i className={getPlatformIcon(content.platform)}></i>
                              <span className="text-sm font-medium capitalize">{content.platform}</span>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {content.characterCount} chars
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-foreground mb-2">{content.content}</p>
                          
                          {content.hashtags && content.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {content.hashtags.map((hashtag, hashIndex) => (
                                <Badge key={hashIndex} variant="outline" className="text-xs">
                                  {hashtag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex justify-between pt-2 border-t">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSaveToDrafts(content)}
                              disabled={savePostMutation.isPending}
                              data-testid={`button-save-draft-${contentIndex}`}
                            >
                              Save Draft
                            </Button>
                            <Button
                              size="sm"
                              onClick={onSchedulePost}
                              data-testid={`button-schedule-${contentIndex}`}
                            >
                              Schedule
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
              
              {message.role === "user" && (
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">U</span>
                </div>
              )}
            </div>
          ))}
          
          {generateContentMutation.isPending && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <i className="fas fa-robot text-white text-sm"></i>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 max-w-md">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <p className="text-sm">Generating content...</p>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Chat Input */}
  <div className="p-6 border-t border-border">
          <div className="flex space-x-4">
            <div className="flex-1">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask AI to create content for your social media... (e.g., 'Create a LinkedIn post about productivity tips')"
                rows={3}
                className="resize-none"
                data-testid="textarea-ai-input"
              />
            </div>
            <div className="flex flex-col space-y-2">
              <Button 
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || generateContentMutation.isPending}
                data-testid="button-send-message"
              >
                {generateContentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <i className="fas fa-paper-plane"></i>
                )}
              </Button>
              <Button 
                variant="outline"
                onClick={clearChat}
                data-testid="button-clear-chat"
              >
                <i className="fas fa-trash"></i>
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <p>Powered by Gemini AI</p>
            <p>Press Enter to send</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
