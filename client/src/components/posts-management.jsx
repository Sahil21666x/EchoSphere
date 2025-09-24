
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PostsManagement({ onCreatePost, onEditPost }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: postsData, isLoading } = useQuery({
    queryKey: ["api/posts"],
  });

  const posts = postsData?.posts || [];

  const deletePostMutation = useMutation({
    mutationFn: async (postId) => {
      const response = await apiRequest("DELETE", `/api/posts/${postId}`);
      if (!response) {
        const errorData = await response;
        throw new Error(errorData.error || 'Failed to delete post');
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post deleted successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/posts"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete post",
        variant: "destructive"
      });
    }
  });

  const duplicatePostMutation = useMutation({
    mutationFn: async (post) => {
      const duplicatedPost = {
        content: `${post.content} (Copy)`,
        platforms: post.platforms,
        status: "draft",
        aiGenerated: post.aiGenerated || false
      };
      const response = await apiRequest("POST", "/api/posts", duplicatedPost);
      if (!response) {
        const errorData = await response;
        throw new Error(errorData.error || 'Failed to duplicate post');
      }
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post duplicated successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/posts"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate post",
        variant: "destructive"
      });
    }
  });

  const filteredPosts = posts.filter((post) => {
    const matchesStatus = statusFilter === "all" || post.status === statusFilter;
    const matchesPlatform = platformFilter === "all" || post.platforms.includes(platformFilter);
    const matchesSearch = searchQuery === "" || 
      post.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesPlatform && matchesSearch;
  });

  const getPlatformIcon = (platforms) => {
    if (platforms.includes("twitter")) return "fab fa-twitter text-blue-500";
    if (platforms.includes("linkedin")) return "fab fa-linkedin text-blue-700";
    if (platforms.includes("instagram")) return "fab fa-instagram text-pink-500";
    return "fas fa-share-alt text-gray-500";
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "posted":
        return <Badge className="bg-green-100 text-green-800">Published</Badge>;
      case "scheduled":
        return <Badge className="bg-orange-100 text-orange-800">Scheduled</Badge>;
      case "draft":
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const formatScheduledDate = (post) => {
    if (post.status === "posted" && post.updatedAt) {
      return `Published ${formatDate(post.updatedAt)}`;
    } else if (post.status === "scheduled" && post.scheduledAt) {
      return `Scheduled for ${formatDate(post.scheduledAt)}`;
    } else if (post.createdAt) {
      return `Created ${formatDate(post.createdAt)}`;
    }
    return "";
  };

  const handleDeletePost = (postId) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      deletePostMutation.mutate(postId);
    }
  };

  const handleDuplicatePost = (post) => {
    duplicatePostMutation.mutate(post);
  };

  return (
    <div className="space-y-6">
      {/* Posts Header with Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <CardTitle>All Posts</CardTitle>
            <Button onClick={onCreatePost} data-testid="button-create-new-post">
              <i className="fas fa-plus mr-2"></i>
              New Post
            </Button>
          </div>
          
          {/* Filters */}
          <div className="flex items-center space-x-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="posted">Published</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="twitter">Twitter</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
              </SelectContent>
            </Select>
            
            <Input
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
              data-testid="input-search-posts"
            />
          </div>
        </CardContent>
      </Card>

      {/* Posts List */}
      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle>Posts</CardTitle>
            <div className="text-sm text-muted-foreground">
              Showing {filteredPosts.length} posts
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-6">
                  <div className="flex items-start space-x-4">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <i className="fas fa-file-alt text-4xl mb-4"></i>
              <p className="text-lg font-medium mb-2">No posts found</p>
              <p className="mb-4">
                {searchQuery || statusFilter !== "all" || platformFilter !== "all" 
                  ? "Try adjusting your filters or search query" 
                  : "Create your first post to get started"
                }
              </p>
              <Button onClick={onCreatePost}>
                <i className="fas fa-plus mr-2"></i>
                Create New Post
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredPosts.map((post) => (
                <div 
                  key={post.id} 
                  className="p-6 hover:bg-secondary/50 transition-colors"
                  data-testid={`post-item-${post.id}`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                      <i className={getPlatformIcon(post.platforms)}></i>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground mb-2 line-clamp-3">
                            {post.content}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>{formatScheduledDate(post)}</span>
                            <span>•</span>
                            <span className="capitalize">{post.platforms.join(", ")}</span>
                            {post.aiGenerated && (
                              <>
                                <span>•</span>
                                <span className="flex items-center">
                                  <i className="fas fa-robot mr-1"></i>
                                  AI Generated
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {getStatusBadge(post.status)}
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditPost(post)}
                              data-testid={`button-edit-${post.id}`}
                            >
                              <i className="fas fa-edit text-muted-foreground"></i>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicatePost(post)}
                              disabled={duplicatePostMutation.isPending}
                              data-testid={`button-duplicate-${post.id}`}
                            >
                              <i className="fas fa-copy text-muted-foreground"></i>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePost(post.id)}
                              disabled={deletePostMutation.isPending}
                              data-testid={`button-delete-${post.id}`}
                            >
                              <i className="fas fa-trash text-muted-foreground"></i>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
