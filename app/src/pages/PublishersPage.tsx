import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Publisher } from '../types';
import Modal from '../components/Modal';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';

export default function PublishersPage() {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Publisher | null>(null);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('publishers').select('*').order('label');
    setPublishers(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setEditing(null);
    setLabel('');
    setError('');
    setShowModal(true);
  }

  function openEdit(p: Publisher) {
    setEditing(p);
    setLabel(p.label);
    setError('');
    setShowModal(true);
  }

  async function save() {
    if (!label.trim()) { setError('Le libellé est requis.'); return; }
    setSaving(true);
    setError('');
    if (editing) {
      const { error: e } = await supabase.from('publishers').update({ label: label.trim() }).eq('id', editing.id);
      if (e) { setError(e.message); setSaving(false); return; }
    } else {
      const { error: e } = await supabase.from('publishers').insert({ label: label.trim() });
      if (e) { setError(e.message); setSaving(false); return; }
    }
    await load();
    setSaving(false);
    setShowModal(false);
  }

  async function del(p: Publisher) {
    if (!confirm(`Supprimer l'éditeur "${p.label}" ?`)) return;
    await supabase.from('publishers').delete().eq('id', p.id);
    await load();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Éditeurs</h1>
          <p className="text-slate-500 text-sm mt-1">{publishers.length} éditeur(s)</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors shadow-sm"
        >
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
          </div>
        ) : publishers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Building2 size={40} className="mb-3 opacity-40" />
            <p>Aucun éditeur enregistré</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Libellé</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date d'ajout</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {publishers.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 text-sm font-medium text-slate-800">{p.label}</td>
                    <td className="px-6 py-3.5 text-sm text-slate-500">
                      {new Date(p.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-sky-50 text-slate-400 hover:text-sky-600 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => del(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
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
        <Modal title={editing ? "Modifier l'éditeur" : 'Ajouter un éditeur'} onClose={() => setShowModal(false)} size="sm">
          <div className="p-6 space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Libellé *</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && save()}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                placeholder="Nom de l'éditeur"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 pt-1">
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
