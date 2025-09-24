import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import AiChat from "./ai-chat";
import ContentCalendar from "./content-calendar";
import PostsManagement from "./posts-management";
import SocialAccounts from "./SocialAccounts";
import PostEditor from "./post-editor";

export default function Dashboard({ onCreatePost }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showPostEditor, setShowPostEditor] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["api/dashboard/stats"],
  });

  const { data: recentPosts, isLoading: recentPostsLoading } = useQuery({
    queryKey: ["api/dashboard/recent-posts"],
  });

  const { data: upcomingPosts, isLoading: upcomingPostsLoading } = useQuery({
    queryKey: ["api/dashboard/upcoming-posts"],
  });

  const formatTimeAgo = (date) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  const formatScheduledTime = (date) => {
    const scheduleDate = new Date(date);
    const now = new Date();
    const diffInHours = Math.floor((scheduleDate.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 24) {
      return scheduleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return scheduleDate.toLocaleDateString();
  };

  const getPlatformIcon = (platforms) => {
    if (platforms.includes("twitter")) return "fab fa-twitter text-blue-500";
    if (platforms.includes("linkedin")) return "fab fa-linkedin text-blue-700";
    if (platforms.includes("instagram")) return "fab fa-instagram text-pink-500";
    return "fas fa-share-alt text-gray-500";
  };

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ai-chat">AI Assistant</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-12 w-12 rounded-lg mb-4" />
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-calendar-check text-blue-600"></i>
                      </div>
                      <span className="text-2xl font-bold text-green-600">+12%</span>
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Scheduled Posts</h3>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-scheduled-posts">
                      {stats?.scheduledPosts || 0}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-check-circle text-green-600"></i>
                      </div>
                      <span className="text-2xl font-bold text-green-600">+8%</span>
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Published This Week</h3>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-published-posts">
                      {stats?.publishedThisWeek || 0}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-robot text-purple-600"></i>
                      </div>
                      <span className="text-2xl font-bold text-green-600">+15%</span>
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">AI Generated</h3>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-ai-generated">
                      {stats?.aiGeneratedPosts || 0}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-heart text-orange-600"></i>
                      </div>
                      <span className="text-2xl font-bold text-green-600">+23%</span>
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Total Engagement</h3>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-total-engagement">
                      {stats?.totalEngagement || 0}
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Recent Activity & Upcoming Posts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Posts */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Posts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentPostsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-start space-x-4 p-4 rounded-lg bg-secondary">
                      <Skeleton className="w-12 h-12 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    </div>
                  ))
                ) : recentPosts && recentPosts.length > 0 ? (
                  recentPosts.map((post) => (
                    <div key={post.id} className="flex items-start space-x-4 p-4 rounded-lg bg-secondary">
                      <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                        <i className={getPlatformIcon(post.platforms)}></i>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground font-medium line-clamp-2">
                          {post.content}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                          <span>{formatTimeAgo(post.updatedAt || post.createdAt)}</span>
                          <span className="flex items-center">
                            <i className="fas fa-heart mr-1"></i>
                            {Math.floor(Math.random() * 50)}
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        Published
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <i className="fas fa-file-alt text-3xl mb-4"></i>
                    <p>No recent posts found</p>
                    <Button onClick={() => setShowPostEditor(true)} className="mt-4" size="sm">
                      Create your first post
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Schedule */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingPostsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-start space-x-4 p-4 rounded-lg bg-secondary">
                      <Skeleton className="w-12 h-12 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    </div>
                  ))
                ) : upcomingPosts && upcomingPosts.length > 0 ? (
                  <>
                    {upcomingPosts.map((post) => (
                      <div key={post.id} className="flex items-start space-x-4 p-4 rounded-lg bg-secondary">
                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                          <i className={getPlatformIcon(post.platforms)}></i>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-foreground font-medium line-clamp-2">
                            {post.content}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                            <span>{formatScheduledTime(post.scheduledAt)}</span>
                            <span className="flex items-center">
                              <i className="fas fa-clock mr-1"></i>Scheduled
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                          Scheduled
                        </span>
                      </div>
                    ))}
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setActiveTab("calendar")}
                      data-testid="button-view-all-scheduled"
                    >
                      View All Scheduled Posts
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <i className="fas fa-calendar-alt text-3xl mb-4"></i>
                    <p>No scheduled posts found</p>
                    <Button onClick={() => {
                      setEditingPost(null);
                      setShowPostEditor(true);
                    }} className="mt-4" size="sm">
                      Schedule a post
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Chat Tab */}
        <TabsContent value="ai-chat">
          <AiChat />
        </TabsContent>

        {/* Content Calendar Tab */}
        <TabsContent value="calendar">
          <ContentCalendar />
        </TabsContent>

        {/* Posts Management Tab */}
        <TabsContent value="posts">
          <PostsManagement 
            onCreatePost={() => setShowPostEditor(true)}
            onEditPost={(post) => {
              setEditingPost(post);
              setShowPostEditor(true);
            }}
          />
        </TabsContent>

        <TabsContent value="accounts">
          <SocialAccounts />
        </TabsContent>

        {/* Post Editor Modal */}
        {showPostEditor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-2xl">
              <PostEditor
                post={editingPost}
                onSave={() => {
                  setShowPostEditor(false);
                  setEditingPost(null);
                }}
                onCancel={() => {
                  setShowPostEditor(false);
                  setEditingPost(null);
                }}
              />
            </div>
          </div>
        )}
      </Tabs>
    </div>
  );
}