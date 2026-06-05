import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Subscriber, Subscription } from '../types';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { Plus, CreditCard, Info } from 'lucide-react';

const BASE_PRICE = 50;

interface SubscriptionWithSubscriber extends Subscription {
  subscriber: Subscriber;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithSubscriber[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedSubscriber, setSelectedSubscriber] = useState('');
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [loyalInfo, setLoyalInfo] = useState<{ isLoyal: boolean; discount: boolean } | null>(null);

  async function load() {
    setLoading(true);
    const [subsRes, subRes] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('*, subscriber:subscribers(*)')
        .order('year', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('subscribers').select('*').order('last_name'),
    ]);
    setSubscriptions((subsRes.data ?? []) as SubscriptionWithSubscriber[]);
    setSubscribers(subRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function checkLoyalty(subscriberId: string) {
    if (!subscriberId) { setLoyalInfo(null); return; }

    const currentYear = new Date().getFullYear();
    const { data: allSubs } = await supabase
      .from('subscriptions')
      .select('year')
      .eq('subscriber_id', subscriberId)
      .order('year', { ascending: false });

    const years = (allSubs ?? []).map((s) => s.year);
    const consecutive3 = years.length >= 3 &&
      years[0] === currentYear - 1 &&
      years[1] === currentYear - 2 &&
      years[2] === currentYear - 3;

    let hasPenalties = false;
    if (consecutive3) {
      const { data: bors } = await supabase
        .from('borrowings')
        .select('late_penalty, condition_penalty')
        .eq('subscriber_id', subscriberId);
      hasPenalties = (bors ?? []).some(
        (b) => (b.late_penalty ?? 0) > 0 || (b.condition_penalty ?? 0) > 0
      );
    }

    setLoyalInfo({ isLoyal: consecutive3, discount: consecutive3 && !hasPenalties });
  }

  async function save() {
    if (!selectedSubscriber) { setError('Sélectionnez un abonné.'); return; }

    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const currentYear = today.getFullYear();

    if (month !== 12 || day < 15 || day > 30) {
      setError(`Les abonnements sont uniquement acceptés du 15 au 30 décembre. Aujourd'hui : ${today.toLocaleDateString('fr-FR')}.`);
      return;
    }

    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('subscriber_id', selectedSubscriber)
      .eq('year', currentYear)
      .maybeSingle();

    if (existing) { setError(`Cet abonné est déjà inscrit pour ${currentYear}.`); return; }

    setSaving(true);
    setError('');

    const discountApplied = loyalInfo?.discount ?? false;
    const finalPrice = discountApplied ? BASE_PRICE * 0.75 : BASE_PRICE;

    const { error: e } = await supabase.from('subscriptions').insert({
      subscriber_id: selectedSubscriber,
      year: currentYear,
      base_price: BASE_PRICE,
      final_price: finalPrice,
      discount_applied: discountApplied,
    });

    if (e) { setError(e.message); setSaving(false); return; }
    await load();
    setSaving(false);
    setShowModal(false);
    setSelectedSubscriber('');
    setLoyalInfo(null);
  }

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from(
    new Set(subscriptions.map((s) => s.year))
  ).sort((a, b) => b - a);
  if (!availableYears.includes(currentYear)) availableYears.unshift(currentYear);

  const filtered = subscriptions.filter((s) => s.year === yearFilter);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Abonnements</h1>
          <p className="text-slate-500 text-sm mt-1">Prix de base : {BASE_PRICE} DA/an</p>
        </div>
        <button
          onClick={() => { setError(''); setSelectedSubscriber(''); setLoyalInfo(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors shadow-sm"
        >
          <Plus size={16} />
          Nouvel abonnement
        </button>
      </div>

      {/* Year filter */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {availableYears.map((y) => (
          <button
            key={y}
            onClick={() => setYearFilter(y)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              yearFilter === y ? 'bg-sky-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-sky-300'
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <CreditCard size={40} className="mb-3 opacity-40" />
            <p>Aucun abonnement pour {yearFilter}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  {['Abonné', 'Année', 'Prix de base', 'Prix final', 'Remise fidélité', 'Date'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5">
                      <p className="text-sm font-semibold text-slate-800">
                        {s.subscriber.last_name} {s.subscriber.first_name}
                      </p>
                      <p className="text-xs text-slate-400">{s.subscriber.email}</p>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-slate-700 font-medium">{s.year}</td>
                    <td className="px-6 py-3.5 text-sm text-slate-500 tabular-nums">{Number(s.base_price).toFixed(2)} DA</td>
                    <td className="px-6 py-3.5 text-sm font-bold text-slate-800 tabular-nums">{Number(s.final_price).toFixed(2)} DA</td>
                    <td className="px-6 py-3.5">
                      {s.discount_applied ? (
                        <Badge variant="green">-25% fidélité</Badge>
                      ) : (
                        <Badge variant="gray">Non</Badge>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-slate-500">
                      {new Date(s.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal title="Nouvel abonnement" onClose={() => setShowModal(false)} size="sm">
          <div className="p-6 space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>}

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
              <Info size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Les abonnements sont acceptés uniquement du <strong>15 au 30 décembre</strong>.
                Prix : {BASE_PRICE} DA (–25% pour abonnés fidèles sans pénalités).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Abonné *</label>
              <select
                value={selectedSubscriber}
                onChange={(e) => { setSelectedSubscriber(e.target.value); checkLoyalty(e.target.value); }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
              >
                <option value="">— Sélectionner —</option>
                {subscribers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.last_name} {s.first_name}
                  </option>
                ))}
              </select>
            </div>

            {loyalInfo && (
              <div className={`rounded-xl p-3 text-sm ${loyalInfo.discount ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                {loyalInfo.discount ? (
                  <p><strong>Abonné fidèle</strong> — Remise de 25% appliquée. Prix : <strong>{(BASE_PRICE * 0.75).toFixed(2)} DA</strong></p>
                ) : loyalInfo.isLoyal ? (
                  <p>Abonné fidèle mais pénalités existantes — Prix normal : <strong>{BASE_PRICE.toFixed(2)} DA</strong></p>
                ) : (
                  <p>Prix normal : <strong>{BASE_PRICE.toFixed(2)} DA</strong></p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {saving ? 'Enregistrement…' : 'Inscrire'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
