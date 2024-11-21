import React, { useEffect } from 'react';
import { useChatStore } from './store';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import AuthScreen from './components/AuthScreen';
import UserProfile from './components/UserProfile';

function App() {
  const { user, loading, init } = useChatStore();

  useEffect(() => {
    const unsubscribe = init();
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [init]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b border-gray-200 flex items-center justify-end px-4">
          <UserProfile />
        </div>
        <div className="flex-1">
          <ChatArea />
        </div>
      </div>
    </div>
  );
}

export default App;