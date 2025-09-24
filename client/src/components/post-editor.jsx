
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon } from "lucide-react";

export default function PostEditor({ post = null, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    content: "",
    platforms: [],
    scheduledAt: new Date(),
    postType: "static",
    status: "draft",
    hashtags: [],
    mentions: []
  });
  const [showScheduler, setShowScheduler] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState("09:00");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (post) {
      setFormData({
        content: post.content || "",
        platforms: post.platforms || [],
        scheduledAt: post.scheduledAt ? new Date(post.scheduledAt) : new Date(),
        postType: post.postType || "static",
        status: post.status || "draft",
        hashtags: post.hashtags || [],
        mentions: post.mentions || []
      });
      setSelectedDate(post.scheduledAt ? new Date(post.scheduledAt) : new Date());
      const date = new Date(post.scheduledAt || new Date());
      setSelectedTime(`${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`);
    }
  }, [post]);

  const savePostMutation = useMutation({
    mutationFn: async (postData) => {
      const url = post ? `/api/posts/${post.id}` : "/api/posts";
      const method = post ? "PUT" : "POST";
      
      const response = await apiRequest(method, url, postData);
      console.log(response);
      
      if (!response) {
        const errorData = await response
        throw new Error(errorData.error || 'Failed to save post');
      }
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: post ? "Post updated successfully" : "Post created successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      onSave && onSave(data);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handlePlatformChange = (platform, checked) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        platforms: [...prev.platforms, platform]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        platforms: prev.platforms.filter(p => p !== platform)
      }));
    }
  };

  const handleSchedulePost = () => {
    const [hours, minutes] = selectedTime.split(':');
    const scheduledDateTime = new Date(selectedDate);
    scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const postData = {
      ...formData,
      scheduledAt: scheduledDateTime.toISOString(),
      status: "scheduled"
    };

    savePostMutation.mutate(postData);
  };

  const handleSaveDraft = () => {
    const postData = {
      ...formData,
      status: "draft"
    };

    savePostMutation.mutate(postData);
  };

  const validateContent = () => {
    const errors = [];
    
    if (!formData.content.trim()) {
      errors.push("Post content is required");
    }
    
    if (formData.platforms.length === 0) {
      errors.push("Select at least one platform");
    }
    
    // Platform-specific validations
    formData.platforms.forEach(platform => {
      if (platform === "twitter" && formData.content.length > 280) {
        errors.push("Twitter posts must be 280 characters or less");
      }
      if (platform === "linkedin" && formData.content.length > 3000) {
        errors.push("LinkedIn posts must be 3000 characters or less");
      }
      if (platform === "instagram" && formData.content.length > 2200) {
        errors.push("Instagram posts must be 2200 characters or less");
      }
    });
    
    return errors;
  };

  const validationErrors = validateContent();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{post ? "Edit Post" : "Create New Post"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Post Type Selection */}
        <div className="space-y-2">
          <Label>Post Type</Label>
          <Select 
            value={formData.postType} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, postType: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="static">Static Post - Simple content, images, quotes</SelectItem>
              <SelectItem value="dynamic">Dynamic Post - Interactive, engaging, polls, questions</SelectItem>
            </SelectContent>
          </Select>
          
          {formData.postType === "dynamic" && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Dynamic posts</strong> are designed to encourage interaction through questions, 
                polls, calls-to-action, and engaging content that prompts responses from your audience.
              </p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-2">
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            placeholder={
              formData.postType === "dynamic" 
                ? "What's a productivity tip that changed your work life? Share below! 👇 #ProductivityTips #WorkLife"
                : "Share your latest business update, insight, or announcement..."
            }
            rows={6}
            className="resize-none"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{formData.content.length} characters</span>
            <div className="flex space-x-2">
              {formData.platforms.map(platform => (
                <span key={platform} className={
                  (platform === "twitter" && formData.content.length > 280) ||
                  (platform === "linkedin" && formData.content.length > 3000) ||
                  (platform === "instagram" && formData.content.length > 2200)
                    ? "text-red-500" : "text-green-600"
                }>
                  {platform}: {
                    platform === "twitter" ? 280 :
                    platform === "linkedin" ? 3000 :
                    2200
                  } max
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Platform Selection */}
        <div className="space-y-2">
          <Label>Platforms</Label>
          <div className="grid grid-cols-3 gap-4">
            {[
              { id: "twitter", name: "Twitter", icon: "fab fa-twitter", color: "text-blue-500" },
              { id: "linkedin", name: "LinkedIn", icon: "fab fa-linkedin", color: "text-blue-700" },
              { id: "instagram", name: "Instagram", icon: "fab fa-instagram", color: "text-pink-500" }
            ].map(platform => (
              <div key={platform.id} className="flex items-center space-x-2">
                <Checkbox
                  id={platform.id}
                  checked={formData.platforms.includes(platform.id)}
                  onCheckedChange={(checked) => handlePlatformChange(platform.id, checked)}
                />
                <Label htmlFor={platform.id} className="flex items-center space-x-2 cursor-pointer">
                  <i className={`${platform.icon} ${platform.color}`}></i>
                  <span>{platform.name}</span>
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Scheduling */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Schedule Post</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowScheduler(!showScheduler)}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              {showScheduler ? "Hide Scheduler" : "Schedule Post"}
            </Button>
          </div>

          {showScheduler && (
            <div className="p-4 border rounded-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {selectedDate.toDateString()}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                Post will be published on {selectedDate.toDateString()} at {selectedTime}
              </div>
            </div>
          )}
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <ul className="text-sm text-red-800 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={savePostMutation.isPending}
          >
            Cancel
          </Button>
          
          <div className="space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={savePostMutation.isPending || validationErrors.length > 0}
            >
              {savePostMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save Draft
            </Button>
            
            {showScheduler ? (
              <Button
                type="button"
                onClick={handleSchedulePost}
                disabled={savePostMutation.isPending || validationErrors.length > 0}
              >
                {savePostMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Schedule Post
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => {
                  const postData = { ...formData, status: "draft" };
                  savePostMutation.mutate(postData);
                }}
                disabled={savePostMutation.isPending || validationErrors.length > 0}
              >
                {savePostMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save Post
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
