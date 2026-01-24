import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { 
  ChatBubbleLeftRightIcon, 
  ClockIcon, 
  ChevronRightIcon, 
  CalendarDaysIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import api from '../api/client';
import DeleteModal from '../components/DeleteModal';

// Types
type ChatHistoryItem = {
  id: string;
  title: string;
  created_at: string;
};

// SWR Fetcher
const fetcher = (url: string) => api.get(url).then((res) => res.data);

export default function HistoryPage() {
  const navigate = useNavigate();

  // Destructure mutate to allow manual updates
  const { data: chats, error, isLoading, mutate } = useSWR<ChatHistoryItem[]>('/chat/list', fetcher);

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Delete Handlers
  const promptDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setItemToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);

    // Remove locally immediately
    const previousData = chats;
    mutate(
      (currentData) => currentData?.filter((chat) => chat.id !== itemToDelete),
      false // Revalidate = false to prevent immediate refetch flicker
    );

    try {
      await api.delete(`/chat/${itemToDelete}`);
      mutate();
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Failed to delete chat", error);
      alert("Failed to delete conversation.");
      mutate(previousData, false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Group chats by Date
  const groupedChats = chats?.reduce((acc, chat) => {
    const date = new Date(chat.created_at).toLocaleDateString(undefined, {
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(chat);
    return acc;
  }, {} as Record<string, ChatHistoryItem[]>);

  return (
    <div className="p-6 max-w-4xl mx-auto h-full flex flex-col">
      
      {/* Delete Confirmation Modal */}
      <DeleteModal 
        isOpen={deleteModalOpen}
        onClose={() => { if(!isDeleting) setDeleteModalOpen(false); }}
        onConfirm={confirmDelete}
        title="Delete Conversation"
        message="Are you sure you want to delete this conversation? All messages will be permanently removed."
        isDeleting={isDeleting}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <ClockIcon className="w-8 h-8 text-blue-500" />
          Chat History
        </h1>
        <div className="text-sm text-gray-500">
            {chats?.length || 0} Conversations
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-800/50 rounded-xl border border-gray-800" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-center">
          Failed to load history. Please try refreshing.
        </div>
      )}

      {/* Empty State */}
      {!isLoading && chats && chats.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mb-6">
            <ChatBubbleLeftRightIcon className="w-10 h-10 opacity-50" />
          </div>
          <h3 className="text-xl font-medium text-gray-300 mb-2">No history yet</h3>
          <p className="mb-6">Start your first conversation to see it here.</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Start New Chat
          </button>
        </div>
      )}

      {/* Chat List */}
      {!isLoading && groupedChats && (
        <div className="space-y-8">
          {Object.entries(groupedChats).map(([date, items]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0 bg-[#0f1117] py-2 z-10">
                <CalendarDaysIcon className="w-4 h-4" />
                {date}
              </div>
              
              <div className="flex flex-col gap-3">
                {items.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => navigate(`/dashboard/chat/${chat.id}`)}
                    className="group relative flex items-center justify-between p-4 bg-[#1a1d26] hover:bg-[#20242f] border border-gray-800 hover:border-blue-500/30 rounded-xl cursor-pointer transition-all duration-200"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform flex-shrink-0">
                        <ChatBubbleLeftRightIcon className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-gray-200 font-medium truncate group-hover:text-blue-400 transition-colors">
                          {chat.title || "Untitled Conversation"}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 bg-gray-800/50 px-2 py-0.5 rounded border border-gray-700/50">
                             {new Date(chat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pl-4">
                        {/* Delete Button (Visible on hover) */}
                        <button
                            onClick={(e) => promptDelete(e, chat.id)}
                            className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Delete Conversation"
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>

                        {/* Arrow */}
                        <div className="text-gray-600 group-hover:text-blue-400 transition-colors">
                            <ChevronRightIcon className="w-5 h-5" />
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}