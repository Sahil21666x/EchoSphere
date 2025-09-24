import { useState } from "react";
import Sidebar from "@/components/sidebar";
import Dashboard from "@/components/dashboard";
import AiChat from "@/components/ai-chat";
import ContentCalendar from "@/components/content-calendar";
import PostsManagement from "@/components/posts-management";
import PostEditor from "@/components/post-editor";

export default function HomePage() {
  const [currentView, setCurrentView] = useState("dashboard");
  const [isPostEditorOpen, setIsPostEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  const renderMainContent = () => {
    switch (currentView) {
      case "dashboard":
        return <Dashboard onCreatePost={() => setIsPostEditorOpen(true)} />;
      case "ai-chat":
        return <AiChat onSchedulePost={() => setIsPostEditorOpen(true)} />;
      case "calendar":
        return <ContentCalendar onCreatePost={() => setIsPostEditorOpen(true)} />;
      case "posts":
        return (
          <PostsManagement 
            onCreatePost={() => setIsPostEditorOpen(true)}
            onEditPost={(post) => {
              setEditingPost(post);
              setIsPostEditorOpen(true);
            }}
          />
        );
      default:
        return <Dashboard onCreatePost={() => setIsPostEditorOpen(true)} />;
    }
  };

  const getPageTitle = () => {
    switch (currentView) {
      case "dashboard":
        return { title: "Dashboard", subtitle: "Overview of your social media performance" };
      case "ai-chat":
        return { title: "AI Assistant", subtitle: "Generate engaging content with artificial intelligence" };
      case "calendar":
        return { title: "Content Calendar", subtitle: "Schedule and manage your social media posts" };
      case "posts":
        return { title: "Posts", subtitle: "Manage all your social media content" };
      default:
        return { title: "Dashboard", subtitle: "Overview of your social media performance" };
    }
  };

  const pageInfo = getPageTitle();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView}
        onCreatePost={() => setIsPostEditorOpen(true)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
  <header className="bg-card border-b border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-pageTitle">
                {pageInfo.title}
              </h1>
              <p className="text-muted-foreground mt-1" data-testid="text-pageSubtitle">
                {pageInfo.subtitle}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setCurrentView("ai-chat")}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                data-testid="button-create-with-ai"
              >
                <i className="fas fa-robot mr-2"></i>
                Create with AI
              </button>
              <button 
                onClick={() => setIsPostEditorOpen(true)}
                className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-secondary transition-colors"
                data-testid="button-schedule-post"
              >
                <i className="fas fa-plus mr-2"></i>
                Schedule Post
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          {renderMainContent()}
        </main>
      </div>

      {/* Post Editor Modal */}
      {isPostEditorOpen && (
        <PostEditor
          post={editingPost}
          onClose={() => {
            setIsPostEditorOpen(false);
            setEditingPost(null);
          }}
          onSave={() => {
            setIsPostEditorOpen(false);
            setEditingPost(null);
          }}
        />
      )}
    </div>
  );
}