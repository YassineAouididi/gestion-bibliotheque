import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import BooksPage from './pages/BooksPage';
import PublishersPage from './pages/PublishersPage';
import SubscribersPage from './pages/SubscribersPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import BorrowingsPage from './pages/BorrowingsPage';
import { Page } from './types';

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [page, setPage] = useState<Page>('dashboard');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Still resolving initial session
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  const content = {
    dashboard: <Dashboard onNavigate={setPage} />,
    books: <BooksPage />,
    publishers: <PublishersPage />,
    subscribers: <SubscribersPage />,
    subscriptions: <SubscriptionsPage />,
    borrowings: <BorrowingsPage />,
  }[page];

  return (
    <Layout currentPage={page} onNavigate={setPage} session={session}>
      {content}
    </Layout>
  );
}
