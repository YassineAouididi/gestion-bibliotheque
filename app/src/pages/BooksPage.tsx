import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Book, Publisher } from '../types';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { Plus, Pencil, Trash2, Search, BookOpen, Archive } from 'lucide-react';

const GENRES = ['Roman', 'Roman classique', 'Conte', 'Poésie', 'Science-fiction', 'Policier', 'Biographie', 'Histoire', 'Sciences', 'Autre'];

interface BookWithPublishers extends Book {
  book_publishers: { publisher: Publisher }[];
}

interface FormState {
  isbn: string;
  title: string;
  genre: string;
  price: string;
  page_count: string;
  publisher_ids: string[];
}

const emptyForm: FormState = { isbn: '', title: '', genre: 'Roman', price: '', page_count: '', publisher_ids: [] };

export default function BooksPage() {
  const [books, setBooks] = useState<BookWithPublishers[]>([]);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<BookWithPublishers | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showRetired, setShowRetired] = useState(false);

  async function load() {
    setLoading(true);
    const [booksRes, pubRes] = await Promise.all([
      supabase.from('books').select('*, book_publishers(publisher:publishers(*))').order('title'),
      supabase.from('publishers').select('*').order('label'),
    ]);
    setBooks((booksRes.data ?? []) as BookWithPublishers[]);
    setPublishers(pubRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  }

  function openEdit(book: BookWithPublishers) {
    setEditing(book);
    setForm({
      isbn: book.isbn,
      title: book.title,
      genre: book.genre,
      price: String(book.price),
      page_count: String(book.page_count),
      publisher_ids: book.book_publishers.map((bp) => bp.publisher.id),
    });
    setError('');
    setShowModal(true);
  }

  async function save() {
    if (!form.isbn.trim() || !form.title.trim() || !form.price || !form.page_count) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      isbn: form.isbn.trim(),
      title: form.title.trim(),
      genre: form.genre,
      price: parseFloat(form.price),
      page_count: parseInt(form.page_count),
    };

    if (editing) {
      const { error: e } = await supabase.from('books').update(payload).eq('id', editing.id);
      if (e) { setError(e.message); setSaving(false); return; }
      // update publishers
      await supabase.from('book_publishers').delete().eq('book_id', editing.id);
      if (form.publisher_ids.length > 0) {
        await supabase.from('book_publishers').insert(
          form.publisher_ids.map((pid) => ({ book_id: editing.id, publisher_id: pid }))
        );
      }
    } else {
      const { data: newBook, error: e } = await supabase.from('books').insert(payload).select().maybeSingle();
      if (e || !newBook) { setError(e?.message ?? 'Erreur'); setSaving(false); return; }
      if (form.publisher_ids.length > 0) {
        await supabase.from('book_publishers').insert(
          form.publisher_ids.map((pid) => ({ book_id: newBook.id, publisher_id: pid }))
        );
      }
    }

    await load();
    setSaving(false);
    setShowModal(false);
  }

  async function retire(book: BookWithPublishers) {
    if (!confirm(`Retirer "${book.title}" du catalogue ?`)) return;
    await supabase.from('books').update({ retired: true, available: false }).eq('id', book.id);
    await load();
  }

  async function deleteBook(book: BookWithPublishers) {
    if (!confirm(`Supprimer définitivement "${book.title}" ?`)) return;
    await supabase.from('books').delete().eq('id', book.id);
    await load();
  }

  const filtered = books
    .filter((b) => (showRetired ? b.retired : !b.retired))
    .filter((b) =>
      `${b.title} ${b.isbn} ${b.genre}`.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Livres</h1>
          <p className="text-slate-500 text-sm mt-1">{books.filter((b) => !b.retired).length} livre(s) au catalogue</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors shadow-sm"
        >
          <Plus size={16} />
          Ajouter un livre
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher titre, ISBN, genre…"
            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400"
          />
        </div>
        <button
          onClick={() => setShowRetired(!showRetired)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
            showRetired ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
          }`}
        >
          <Archive size={14} />
          {showRetired ? 'Voir actifs' : 'Retirés'}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <BookOpen size={40} className="mb-3 opacity-40" />
            <p>Aucun livre trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  {['ISBN', 'Titre', 'Genre', 'Éditeur(s)', 'Pages', 'Prix', 'Disponibilité', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((book) => (
                  <tr key={book.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 text-xs font-mono text-slate-500">{book.isbn}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-800 max-w-[220px]">
                      <span className="line-clamp-1">{book.title}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="sky">{book.genre}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-500 max-w-[180px]">
                      <span className="line-clamp-1">
                        {book.book_publishers.length > 0
                          ? book.book_publishers.map((bp) => bp.publisher.label).join(', ')
                          : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 tabular-nums">{book.page_count}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-700 tabular-nums">
                      {book.price.toFixed(2)} DA
                    </td>
                    <td className="px-5 py-3.5">
                      {book.retired ? (
                        <Badge variant="gray">Retiré</Badge>
                      ) : book.available ? (
                        <Badge variant="green">Disponible</Badge>
                      ) : (
                        <Badge variant="yellow">Emprunté</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(book)}
                          className="p-1.5 rounded-lg hover:bg-sky-50 text-slate-400 hover:text-sky-600 transition-colors"
                          title="Modifier"
                        >
                          <Pencil size={14} />
                        </button>
                        {!book.retired && (
                          <button
                            onClick={() => retire(book)}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors"
                            title="Retirer du catalogue"
                          >
                            <Archive size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => deleteBook(book)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <Modal title={editing ? 'Modifier le livre' : 'Ajouter un livre'} onClose={() => setShowModal(false)} size="lg">
          <div className="p-6 space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">ISBN *</label>
                <input
                  value={form.isbn}
                  onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  placeholder="978-2-..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Genre *</label>
                <select
                  value={form.genre}
                  onChange={(e) => setForm({ ...form, genre: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                >
                  {GENRES.map((g) => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Titre *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                placeholder="Titre du livre"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nombre de pages *</label>
                <input
                  type="number"
                  min="1"
                  value={form.page_count}
                  onChange={(e) => setForm({ ...form, page_count: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  placeholder="Ex: 300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Prix (DA) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  placeholder="Ex: 12.50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Éditeur(s)</label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-slate-200 rounded-xl p-3">
                {publishers.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.publisher_ids.includes(p.id)}
                      onChange={(e) => {
                        const ids = e.target.checked
                          ? [...form.publisher_ids, p.id]
                          : form.publisher_ids.filter((id) => id !== p.id);
                        setForm({ ...form, publisher_ids: ids });
                      }}
                      className="accent-sky-500"
                    />
                    {p.label}
                  </label>
                ))}
                {publishers.length === 0 && <p className="text-xs text-slate-400 col-span-2">Aucun éditeur. Ajoutez-en d'abord.</p>}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {saving ? 'Enregistrement…' : editing ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
