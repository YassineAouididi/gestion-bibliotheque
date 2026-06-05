import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Borrowing, Subscriber, Book, BorrowCondition } from '../types';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { Plus, ArrowLeftRight, CheckCircle, AlertTriangle, Search } from 'lucide-react';

interface BorrowingFull extends Borrowing {
  subscriber: Subscriber;
  book: Book;
}

type FilterStatus = 'all' | 'en_cours' | 'rendu' | 'overdue';

export default function BorrowingsPage() {
  const [borrowings, setBorrowings] = useState<BorrowingFull[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('en_cours');
  const [search, setSearch] = useState('');

  // New borrowing modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSubId, setNewSubId] = useState('');
  const [newBookId, setNewBookId] = useState('');
  const [newSaving, setNewSaving] = useState(false);
  const [newError, setNewError] = useState('');

  // Return modal
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returning, setReturning] = useState<BorrowingFull | null>(null);
  const [returnCondition, setReturnCondition] = useState<BorrowCondition>('bon');
  const [returnDate, setReturnDate] = useState('');
  const [returnSaving, setReturnSaving] = useState(false);
  const [returnError, setReturnError] = useState('');
  const [penaltySummary, setPenaltySummary] = useState<{ late: number; condition: number } | null>(null);

  async function load() {
    setLoading(true);
    const [borRes, subRes, bookRes] = await Promise.all([
      supabase
        .from('borrowings')
        .select('*, subscriber:subscribers(*), book:books(*)')
        .order('borrow_date', { ascending: false }),
      supabase.from('subscribers').select('*').order('last_name'),
      supabase.from('books').select('*').eq('available', true).eq('retired', false).order('title'),
    ]);
    setBorrowings((borRes.data ?? []) as BorrowingFull[]);
    setSubscribers(subRes.data ?? []);
    setBooks(bookRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().split('T')[0];

  // Compute due date from page_count
  function calcDueDate(borrowDate: string, pageCount: number): string {
    const d = new Date(borrowDate);
    d.setDate(d.getDate() + (pageCount < 300 ? 7 : 15));
    return d.toISOString().split('T')[0];
  }

  async function createBorrowing() {
    if (!newSubId || !newBookId) { setNewError('Sélectionnez un abonné et un livre.'); return; }

    const currentYear = new Date().getFullYear();
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('subscriber_id', newSubId)
      .eq('year', currentYear)
      .maybeSingle();

    if (!sub) {
      setNewError(`L'abonné n'a pas d'abonnement actif pour ${currentYear}. Veuillez d'abord l'inscrire.`);
      return;
    }

    const { data: book } = await supabase.from('books').select('*').eq('id', newBookId).maybeSingle();
    if (!book || !book.available) { setNewError('Ce livre n\'est plus disponible.'); return; }

    setNewSaving(true);
    setNewError('');

    const borrowDate = today;
    const dueDate = calcDueDate(borrowDate, book.page_count);

    const { error: e } = await supabase.from('borrowings').insert({
      subscriber_id: newSubId,
      book_id: newBookId,
      borrow_date: borrowDate,
      due_date: dueDate,
    });

    if (e) { setNewError(e.message); setNewSaving(false); return; }

    // Mark book as unavailable
    await supabase.from('books').update({ available: false, last_borrowed_at: new Date().toISOString() }).eq('id', newBookId);

    await load();
    setNewSaving(false);
    setShowNewModal(false);
    setNewSubId('');
    setNewBookId('');
  }

  function openReturn(b: BorrowingFull) {
    setReturning(b);
    setReturnCondition('bon');
    setReturnDate(today);
    setPenaltySummary(null);
    setReturnError('');
    setShowReturnModal(true);
  }

  function computePenalties(b: BorrowingFull, rDate: string, cond: BorrowCondition) {
    let late = 0;
    if (rDate > b.due_date) {
      const dueDateObj = new Date(b.due_date);
      const returnDateObj = new Date(rDate);
      const days = Math.ceil((returnDateObj.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24));
      late = days * 0.01 * b.book.price;
    }
    let condition = 0;
    if (cond === 'use') condition = b.book.price * 0.75;
    else if (cond === 'completement_use') condition = b.book.price;
    return { late, condition };
  }

  async function processReturn() {
    if (!returning || !returnDate) { setReturnError('Date de retour requise.'); return; }
    if (returnDate < returning.borrow_date) { setReturnError('La date de retour ne peut pas être avant la date d\'emprunt.'); return; }

    const penalties = computePenalties(returning, returnDate, returnCondition);
    setPenaltySummary(penalties);

    setReturnSaving(true);
    setReturnError('');

    await supabase.from('borrowings').update({
      return_date: returnDate,
      condition: returnCondition,
      late_penalty: penalties.late,
      condition_penalty: penalties.condition,
      status: 'rendu',
    }).eq('id', returning.id);

    // Mark book available again (unless completely destroyed)
    const bookAvailable = returnCondition !== 'completement_use';
    await supabase.from('books').update({ available: bookAvailable }).eq('id', returning.book_id);

    await load();
    setReturnSaving(false);
    setShowReturnModal(false);
    setReturning(null);
  }

  const filtered = borrowings
    .filter((b) => {
      if (filter === 'en_cours') return b.status === 'en_cours';
      if (filter === 'rendu') return b.status === 'rendu';
      if (filter === 'overdue') return b.status === 'en_cours' && b.due_date < today;
      return true;
    })
    .filter((b) =>
      `${b.subscriber.first_name} ${b.subscriber.last_name} ${b.book.title}`.toLowerCase().includes(search.toLowerCase())
    );

  const counts = {
    en_cours: borrowings.filter((b) => b.status === 'en_cours').length,
    rendu: borrowings.filter((b) => b.status === 'rendu').length,
    overdue: borrowings.filter((b) => b.status === 'en_cours' && b.due_date < today).length,
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Emprunts</h1>
          <p className="text-slate-500 text-sm mt-1">{counts.en_cours} en cours · {counts.overdue} en retard</p>
        </div>
        <button
          onClick={() => { setNewError(''); setNewSubId(''); setNewBookId(''); setShowNewModal(true); }}
          className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors shadow-sm"
        >
          <Plus size={16} />
          Nouvel emprunt
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {([
          { id: 'all', label: `Tous (${borrowings.length})` },
          { id: 'en_cours', label: `En cours (${counts.en_cours})` },
          { id: 'overdue', label: `En retard (${counts.overdue})` },
          { id: 'rendu', label: `Rendus (${counts.rendu})` },
        ] as { id: FilterStatus; label: string }[]).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.id
                ? f.id === 'overdue' ? 'bg-red-500 text-white' : 'bg-sky-500 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-sky-300'
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="relative flex-1 max-w-xs ml-auto">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-full text-sm w-full focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <ArrowLeftRight size={40} className="mb-3 opacity-40" />
            <p>Aucun emprunt</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  {['Abonné', 'Livre', 'Emprunt', 'Échéance', 'Retour', 'Pénalités', 'État', 'Action'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((b) => {
                  const overdue = b.status === 'en_cours' && b.due_date < today;
                  const totalPenalty = (b.late_penalty ?? 0) + (b.condition_penalty ?? 0);
                  return (
                    <tr key={b.id} className={`hover:bg-slate-50 transition-colors ${overdue ? 'bg-red-50/30' : ''}`}>
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-slate-800">
                          {b.subscriber.last_name} {b.subscriber.first_name}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-700 max-w-[180px]">
                        <span className="line-clamp-1">{b.book.title}</span>
                        <span className="text-xs text-slate-400">{b.book.page_count}p</span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-500 tabular-nums">
                        {new Date(b.borrow_date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-5 py-3.5 text-sm tabular-nums">
                        <span className={overdue ? 'text-red-600 font-semibold' : 'text-slate-500'}>
                          {new Date(b.due_date).toLocaleDateString('fr-FR')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-500 tabular-nums">
                        {b.return_date ? new Date(b.return_date).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-sm tabular-nums">
                        {totalPenalty > 0 ? (
                          <span className="text-red-600 font-semibold flex items-center gap-1">
                            <AlertTriangle size={12} />
                            {totalPenalty.toFixed(2)} DA
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        {b.status === 'rendu' ? (
                          <Badge variant="green">Rendu</Badge>
                        ) : overdue ? (
                          <Badge variant="red">En retard</Badge>
                        ) : (
                          <Badge variant="sky">En cours</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {b.status === 'en_cours' && (
                          <button
                            onClick={() => openReturn(b)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium transition-colors border border-emerald-200"
                          >
                            <CheckCircle size={12} />
                            Retour
                          </button>
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

      {/* New borrowing modal */}
      {showNewModal && (
        <Modal title="Nouvel emprunt" onClose={() => setShowNewModal(false)} size="sm">
          <div className="p-6 space-y-4">
            {newError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{newError}</p>}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Abonné *</label>
              <select
                value={newSubId}
                onChange={(e) => setNewSubId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
              >
                <option value="">— Sélectionner un abonné —</option>
                {subscribers.map((s) => (
                  <option key={s.id} value={s.id}>{s.last_name} {s.first_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Livre disponible *</label>
              <select
                value={newBookId}
                onChange={(e) => setNewBookId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
              >
                <option value="">— Sélectionner un livre —</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} ({b.page_count}p) — {Number(b.price).toFixed(2)} DA
                  </option>
                ))}
              </select>
              {newBookId && (() => {
                const b = books.find((bk) => bk.id === newBookId);
                if (!b) return null;
                const dueDate = calcDueDate(today, b.page_count);
                return (
                  <p className="text-xs text-slate-500 mt-1.5">
                    Durée : {b.page_count < 300 ? '7 jours' : '15 jours'} — À rendre le {new Date(dueDate).toLocaleDateString('fr-FR')}
                  </p>
                );
              })()}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowNewModal(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button
                onClick={createBorrowing}
                disabled={newSaving}
                className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {newSaving ? 'Enregistrement…' : 'Créer l\'emprunt'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Return modal */}
      {showReturnModal && returning && (
        <Modal title="Enregistrer le retour" onClose={() => setShowReturnModal(false)} size="sm">
          <div className="p-6 space-y-4">
            {returnError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{returnError}</p>}

            <div className="bg-slate-50 rounded-xl p-3 space-y-1">
              <p className="text-sm font-semibold text-slate-800">{returning.book.title}</p>
              <p className="text-xs text-slate-500">
                {returning.subscriber.last_name} {returning.subscriber.first_name} · Emprunté le {new Date(returning.borrow_date).toLocaleDateString('fr-FR')} · À rendre le{' '}
                <span className={returning.due_date < today ? 'text-red-600 font-semibold' : ''}>
                  {new Date(returning.due_date).toLocaleDateString('fr-FR')}
                </span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Date de retour *</label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => { setReturnDate(e.target.value); setPenaltySummary(null); }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">État du livre *</label>
              <div className="space-y-2">
                {([
                  { value: 'bon', label: 'Bon état', desc: 'Aucune pénalité', color: 'emerald' },
                  { value: 'use', label: 'Usé / déchiré', desc: `Pénalité: ${(returning.book.price * 0.75).toFixed(2)} DA (75%)`, color: 'amber' },
                  { value: 'completement_use', label: 'Complètement usé', desc: `Remboursement: ${Number(returning.book.price).toFixed(2)} DA (100%)`, color: 'red' },
                ] as { value: BorrowCondition; label: string; desc: string; color: string }[]).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      returnCondition === opt.value
                        ? `border-${opt.color}-400 bg-${opt.color}-50`
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="condition"
                      value={opt.value}
                      checked={returnCondition === opt.value}
                      onChange={() => { setReturnCondition(opt.value); setPenaltySummary(null); }}
                      className="mt-0.5 accent-sky-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{opt.label}</p>
                      <p className="text-xs text-slate-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Preview penalties */}
            {returnDate && (() => {
              const p = computePenalties(returning, returnDate, returnCondition);
              const total = p.late + p.condition;
              if (total === 0 && !penaltySummary) return null;
              return (
                <div className={`rounded-xl p-3 text-sm ${total > 0 ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'}`}>
                  {p.late > 0 && <p>Retard : <strong>{p.late.toFixed(2)} DA</strong></p>}
                  {p.condition > 0 && <p>Dégradation : <strong>{p.condition.toFixed(2)} DA</strong></p>}
                  {total > 0 ? <p className="font-bold mt-1">Total : {total.toFixed(2)} DA</p> : <p>Aucune pénalité</p>}
                </div>
              );
            })()}

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowReturnModal(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button
                onClick={processReturn}
                disabled={returnSaving}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {returnSaving ? 'Enregistrement…' : 'Confirmer le retour'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
