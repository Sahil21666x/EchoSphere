
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function ContentCalendar({ onCreatePost }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("week");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [postTypeFilter, setPostTypeFilter] = useState("all");
  
  const { data: postsData = {}, isLoading } = useQuery({
    queryKey: ["api/posts"],
  });

  const posts = postsData.posts || [];

  const getWeekDates = (date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const weekDate = new Date(start);
      weekDate.setDate(start.getDate() + i);
      dates.push(weekDate);
    }
    return dates;
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 22; hour++) {
      slots.push(hour);
    }
    return slots;
  };

  const getPostsForDateAndTime = (date, hour) => {
    return posts.filter((post) => {
      if (!post.scheduledAt) return false;
      
      const postDate = new Date(post.scheduledAt);
      const isSameDate = postDate.toDateString() === date.toDateString();
      const isSameHour = postDate.getHours() === hour;
      
      let matches = isSameDate && isSameHour;
      
      if (platformFilter !== "all") {
        matches = matches && post.platforms.includes(platformFilter);
      }
      
      if (postTypeFilter !== "all") {
        const postType = post.postType || "static";
        matches = matches && postType === postTypeFilter;
      }
      
      return matches;
    });
  };

  const getPlatformIcon = (platforms) => {
    if (platforms.includes("twitter")) return "fab fa-twitter";
    if (platforms.includes("linkedin")) return "fab fa-linkedin";
    if (platforms.includes("instagram")) return "fab fa-instagram";
    return "fas fa-share-alt";
  };

  const getPlatformColor = (platforms) => {
    if (platforms.includes("twitter")) return "bg-blue-100 text-blue-800";
    if (platforms.includes("linkedin")) return "bg-blue-100 text-blue-800";
    if (platforms.includes("instagram")) return "bg-pink-100 text-pink-800";
    return "bg-gray-100 text-gray-800";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "posted": return "bg-green-500";
      case "scheduled": return "bg-blue-500";
      case "draft": return "bg-gray-400";
      case "failed": return "bg-red-500";
      default: return "bg-gray-400";
    }
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + (direction === "next" ? 7 : -7));
    setSelectedDate(newDate);
  };

  const weekDates = getWeekDates(selectedDate);
  const timeSlots = getTimeSlots();

  const formatHour = (hour) => {
    if (hour === 0) return "12 AM";
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return "12 PM";
    return `${hour - 12} PM`;
  };

  const getDayName = (date) => {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  };

  const getDayNumber = (date) => {
    return date.getDate();
  };

  return (
    <Card>
      {/* Calendar Header */}
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Content Calendar</CardTitle>
            <p className="text-sm text-muted-foreground">Schedule and manage your social media posts</p>
          </div>
          <div className="flex items-center space-x-4">
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
            <Select value={postTypeFilter} onValueChange={setPostTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="dynamic">Dynamic Posts</SelectItem>
                <SelectItem value="static">Static Posts</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={onCreatePost} data-testid="button-create-new-post">
              <i className="fas fa-plus mr-2"></i>
              New Post
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigateWeek("prev")}
              data-testid="button-previous-week"
            >
              <i className="fas fa-chevron-left"></i>
            </Button>
            <h3 className="text-xl font-semibold text-foreground">
              {selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigateWeek("next")}
              data-testid="button-next-week"
            >
              <i className="fas fa-chevron-right"></i>
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant={viewMode === "month" ? "default" : "outline"} 
              size="sm"
              onClick={() => setViewMode("month")}
              data-testid="button-view-month"
            >
              Month
            </Button>
            <Button 
              variant={viewMode === "week" ? "default" : "outline"} 
              size="sm"
              onClick={() => setViewMode("week")}
              data-testid="button-view-week"
            >
              Week
            </Button>
            <Button 
              variant={viewMode === "day" ? "default" : "outline"} 
              size="sm"
              onClick={() => setViewMode("day")}
              data-testid="button-view-day"
            >
              Day
            </Button>
          </div>
        </div>

        {/* Calendar Grid - Week View */}
        {viewMode === "week" && (
          <div className="grid grid-cols-8 gap-px bg-border rounded-lg overflow-hidden">
            {/* Time column header */}
            <div className="bg-secondary p-3">
              <p className="text-xs font-medium text-muted-foreground text-center">Time</p>
            </div>
            
            {/* Day headers */}
            {weekDates.map((date, index) => (
              <div key={index} className="bg-secondary p-3">
                <p className="text-xs font-medium text-muted-foreground text-center">
                  {getDayName(date)} {getDayNumber(date)}
                </p>
              </div>
            ))}

            {/* Time slots with posts */}
            {timeSlots.map((hour) => (
              <div key={hour} className="contents">
                {/* Time label */}
                <div className="bg-card p-2 flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">{formatHour(hour)}</p>
                </div>
                
                {/* Day columns */}
                {weekDates.map((date, dateIndex) => {
                  const postsForSlot = getPostsForDateAndTime(date, hour);
                  return (
                    <div key={`${hour}-${dateIndex}`} className="bg-card p-2 min-h-[60px]">
                      {postsForSlot.map((post) => (
                        <div
                          key={post.id}
                          className={`${getPlatformColor(post.platforms)} p-2 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity mb-1`}
                          data-testid={`post-${post.id}`}
                        >
                          <div className="flex items-center space-x-1 mb-1">
                            <i className={`${getPlatformIcon(post.platforms)} text-xs`}></i>
                            <span className="font-medium capitalize">
                              {post.platforms[0]}
                            </span>
                          </div>
                          <p className="truncate">{post.content.substring(0, 30)}...</p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Calendar Grid - Month View */}
        {viewMode === "month" && (
          <div className="text-center py-8 text-muted-foreground">
            <i className="fas fa-calendar-alt text-3xl mb-4"></i>
            <p>Month view coming soon</p>
          </div>
        )}

        {/* Calendar Grid - Day View */}
        {viewMode === "day" && (
          <div className="text-center py-8 text-muted-foreground">
            <i className="fas fa-calendar-day text-3xl mb-4"></i>
            <p>Day view coming soon</p>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center space-x-6 mt-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-muted-foreground">Scheduled</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-muted-foreground">Published</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-400 rounded"></div>
            <span className="text-muted-foreground">Draft</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-muted-foreground">Failed</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
