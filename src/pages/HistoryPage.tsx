import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { 
  ChatBubbleLeftRightIcon, 
  ClockIcon, 
  ChevronRightIcon, 
  CalendarDaysIcon 
} from '@heroicons/react/24/outline';
import api from '../api/client';

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

  // Use SWR for caching & auto-revalidation
  const { data: chats, error, isLoading } = useSWR<ChatHistoryItem[]>('/chat/list', fetcher);

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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
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
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform flex-shrink-0">
                        <ChatBubbleLeftRightIcon className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="min-w-0">
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

                    {/* Arrow */}
                    <div className="text-gray-600 group-hover:text-blue-400 transition-colors pl-4">
                      <ChevronRightIcon className="w-5 h-5" />
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