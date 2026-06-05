import { Session } from '@supabase/supabase-js';
import {
  BookOpen,
  Building2,
  Users,
  CreditCard,
  ArrowLeftRight,
  LayoutDashboard,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Page } from '../types';

interface NavItem {
  id: Page;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'books', label: 'Livres', icon: BookOpen },
  { id: 'publishers', label: 'Éditeurs', icon: Building2 },
  { id: 'subscribers', label: 'Abonnés', icon: Users },
  { id: 'subscriptions', label: 'Abonnements', icon: CreditCard },
  { id: 'borrowings', label: 'Emprunts', icon: ArrowLeftRight },
];

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  session: Session;
  children: React.ReactNode;
}

export default function Layout({ currentPage, onNavigate, session, children }: LayoutProps) {
  const displayName =
    session.user.user_metadata?.full_name ||
    session.user.email?.split('@')[0] ||
    'Bibliothécaire';

  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 flex flex-col shadow-xl flex-shrink-0">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-sky-500 rounded-lg flex items-center justify-center">
              <BookOpen size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">BiblioGest</p>
              <p className="text-slate-400 text-xs">Gestion de bibliothèque</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-sky-500 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {active && <ChevronRight size={14} />}
              </button>
            );
          })}
        </nav>

        {/* User + sign out */}
        <div className="px-4 py-4 border-t border-slate-700 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-sky-400">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-200 text-xs font-medium truncate">{displayName}</p>
              <p className="text-slate-500 text-xs truncate">{session.user.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-red-400 text-xs font-medium transition-all duration-150"
          >
            <LogOut size={14} />
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
