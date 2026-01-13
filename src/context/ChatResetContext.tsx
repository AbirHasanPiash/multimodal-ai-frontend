import { createContext, useContext, useState, type ReactNode } from 'react';

type ChatResetContextType = {
  resetKey: number;
  triggerReset: () => void;
};

const ChatResetContext = createContext<ChatResetContextType | null>(null);

export function ChatResetProvider({ children }: { children: ReactNode }) {
  const [resetKey, setResetKey] = useState(0);

  const triggerReset = () => {
    setResetKey((k) => k + 1);
  };

  return (
    <ChatResetContext.Provider value={{ resetKey, triggerReset }}>
      {children}
    </ChatResetContext.Provider>
  );
}

export function useChatReset() {
  const ctx = useContext(ChatResetContext);
  if (!ctx) throw new Error('useChatReset must be used inside ChatResetProvider');
  return ctx;
}