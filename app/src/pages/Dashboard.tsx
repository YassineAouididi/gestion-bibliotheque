import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Page } from '../types';
import { BookOpen, Users, ArrowLeftRight, AlertTriangle, TrendingUp, Clock } from 'lucide-react';

interface Stats {
  totalBooks: number;
  availableBooks: number;
  totalSubscribers: number;
  activeSubscriptions: number;
  activeBorrowings: number;
  overdueBorrowings: number;
  totalPenalties: number;
}

interface RecentBorrowing {
  id: string;
  borrow_date: string;
  due_date: string;
  status: string;
  subscriber: { first_name: string; last_name: string } | null;
  book: { title: string } | null;
}

interface Props {
  onNavigate: (page: Page) => void;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-slate-500 text-sm font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard({ onNavigate }: Props) {
  const [stats, setStats] = useState<Stats>({
    totalBooks: 0,
    availableBooks: 0,
    totalSubscribers: 0,
    activeSubscriptions: 0,
    activeBorrowings: 0,
    overdueBorrowings: 0,
    totalPenalties: 0,
  });
  const [recentBorrowings, setRecentBorrowings] = useState<RecentBorrowing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0];
      const currentYear = new Date().getFullYear();

      const [booksRes, subscribersRes, subsRes, borrowingsRes, overdueRes, penaltiesRes, recentRes] =
        await Promise.all([
          supabase.from('books').select('id, available').eq('retired', false),
          supabase.from('subscribers').select('id', { count: 'exact' }),
          supabase.from('subscriptions').select('id', { count: 'exact' }).eq('year', currentYear),
          supabase.from('borrowings').select('id', { count: 'exact' }).eq('status', 'en_cours'),
          supabase.from('borrowings').select('id', { count: 'exact' }).eq('status', 'en_cours').lt('due_date', today),
          supabase.from('borrowings').select('late_penalty, condition_penalty'),
          supabase
            .from('borrowings')
            .select('id, borrow_date, due_date, status, subscriber:subscribers(first_name,last_name), book:books(title)')
            .order('created_at', { ascending: false })
            .limit(6),
        ]);

      const books = booksRes.data ?? [];
      const penalties = penaltiesRes.data ?? [];
      const totalPenalties = penalties.reduce(
        (sum, b) => sum + (b.late_penalty ?? 0) + (b.condition_penalty ?? 0),
        0
      );

      setStats({
        totalBooks: books.length,
        availableBooks: books.filter((b) => b.available).length,
        totalSubscribers: subscribersRes.count ?? 0,
        activeSubscriptions: subsRes.count ?? 0,
        activeBorrowings: borrowingsRes.count ?? 0,
        overdueBorrowings: overdueRes.count ?? 0,
        totalPenalties,
      });

      setRecentBorrowings((recentRes.data ?? []) as RecentBorrowing[]);
      setLoading(false);
    }

    load();
  }, []);

  const today = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
        <p className="text-slate-500 text-sm mt-1">Vue d'ensemble de la bibliothèque</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
        <StatCard
          label="Livres disponibles"
          value={`${stats.availableBooks} / ${stats.totalBooks}`}
          sub="dans le catalogue actif"
          icon={BookOpen}
          color="bg-sky-500"
        />
        <StatCard
          label="Abonnés inscrits"
          value={stats.totalSubscribers}
          sub={`${stats.activeSubscriptions} abonnement(s) actif(s) ${new Date().getFullYear()}`}
          icon={Users}
          color="bg-emerald-500"
        />
        <StatCard
          label="Emprunts en cours"
          value={stats.activeBorrowings}
          sub="livres actuellement empruntés"
          icon={ArrowLeftRight}
          color="bg-indigo-500"
        />
        <StatCard
          label="Emprunts en retard"
          value={stats.overdueBorrowings}
          sub="dépassement de la date limite"
          icon={Clock}
          color={stats.overdueBorrowings > 0 ? 'bg-red-500' : 'bg-slate-400'}
        />
        <StatCard
          label="Total pénalités"
          value={`${stats.totalPenalties.toFixed(2)} DA`}
          sub="retard + dégradation"
          icon={AlertTriangle}
          color="bg-amber-500"
        />
        <StatCard
          label={`Abonnements ${new Date().getFullYear()}`}
          value={stats.activeSubscriptions}
          sub={`Exercice ${new Date().getFullYear()}`}
          icon={TrendingUp}
          color="bg-violet-500"
        />
      </div>

      {/* Recent borrowings */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Emprunts récents</h2>
          <button
            onClick={() => onNavigate('borrowings')}
            className="text-sky-600 hover:text-sky-700 text-sm font-medium"
          >
            Voir tout
          </button>
        </div>
        {recentBorrowings.length === 0 ? (
          <div className="py-12 text-center text-slate-400">Aucun emprunt enregistré</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Abonné</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Livre</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Emprunt</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Échéance</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentBorrowings.map((b) => {
                  const overdue = b.status === 'en_cours' && b.due_date < today;
                  return (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 text-sm text-slate-700 font-medium">
                        {b.subscriber ? `${b.subscriber.first_name} ${b.subscriber.last_name}` : '—'}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-slate-600">{b.book?.title ?? '—'}</td>
                      <td className="px-6 py-3.5 text-sm text-slate-500">
                        {new Date(b.borrow_date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-3.5 text-sm">
                        <span className={overdue ? 'text-red-600 font-semibold' : 'text-slate-500'}>
                          {new Date(b.due_date).toLocaleDateString('fr-FR')}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        {b.status === 'rendu' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                            Rendu
                          </span>
                        ) : overdue ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 ring-1 ring-red-200">
                            En retard
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 ring-1 ring-sky-200">
                            En cours
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
