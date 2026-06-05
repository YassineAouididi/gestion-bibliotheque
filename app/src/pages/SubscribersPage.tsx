import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Subscriber } from '../types';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { Plus, Pencil, Trash2, Users, Search } from 'lucide-react';

interface FormState {
  first_name: string;
  last_name: string;
  email: string;
  age: string;
  gender: 'M' | 'F' | 'Autre';
  phone: string;
}

const emptyForm: FormState = { first_name: '', last_name: '', email: '', age: '', gender: 'M', phone: '' };

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Subscriber | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('subscribers').select('*').order('last_name');
    setSubscribers(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  }

  function openEdit(s: Subscriber) {
    setEditing(s);
    setForm({
      first_name: s.first_name,
      last_name: s.last_name,
      email: s.email,
      age: String(s.age),
      gender: s.gender,
      phone: s.phone,
    });
    setError('');
    setShowModal(true);
  }

  async function save() {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim() || !form.age || !form.phone.trim()) {
      setError('Tous les champs sont obligatoires.');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      age: parseInt(form.age),
      gender: form.gender,
      phone: form.phone.trim(),
    };

    if (editing) {
      const { error: e } = await supabase.from('subscribers').update(payload).eq('id', editing.id);
      if (e) { setError(e.message); setSaving(false); return; }
    } else {
      const { error: e } = await supabase.from('subscribers').insert(payload);
      if (e) { setError(e.message); setSaving(false); return; }
    }

    await load();
    setSaving(false);
    setShowModal(false);
  }

  async function del(s: Subscriber) {
    if (!confirm(`Supprimer l'abonné "${s.first_name} ${s.last_name}" ? Ses données seront perdues.`)) return;
    await supabase.from('subscribers').delete().eq('id', s.id);
    await load();
  }

  const filtered = subscribers.filter((s) =>
    `${s.first_name} ${s.last_name} ${s.email} ${s.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Abonnés</h1>
          <p className="text-slate-500 text-sm mt-1">{subscribers.length} abonné(s)</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors shadow-sm"
        >
          <Plus size={16} />
          Ajouter un abonné
        </button>
      </div>

      <div className="mb-5">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher nom, email…"
            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Users size={40} className="mb-3 opacity-40" />
            <p>Aucun abonné trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  {['Nom & Prénom', 'Email', 'Téléphone', 'Âge', 'Genre', 'Date inscription', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-slate-800">{s.last_name} {s.first_name}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{s.email}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{s.phone}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{s.age} ans</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={s.gender === 'F' ? 'sky' : 'blue'}>{s.gender}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">
                      {new Date(s.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-sky-50 text-slate-400 hover:text-sky-600 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => del(s)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
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

      {showModal && (
        <Modal title={editing ? "Modifier l'abonné" : 'Ajouter un abonné'} onClose={() => setShowModal(false)} size="md">
          <div className="p-6 space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nom *</label>
                <input
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Prénom *</label>
                <input
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Adresse e-mail *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Âge *</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Genre *</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value as 'M' | 'F' | 'Autre' })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                >
                  <option value="M">M</option>
                  <option value="F">F</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Téléphone *</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
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
