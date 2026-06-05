import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { BookOpen, Mail, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';

type Mode = 'login' | 'signup';

const ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Email ou mot de passe incorrect.',
  'User already registered': 'Un compte existe déjà avec cet email.',
  'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères.',
  'Unable to validate email address: invalid format': 'Adresse email invalide.',
};

function friendlyError(msg: string): string {
  for (const [key, val] of Object.entries(ERROR_MESSAGES)) {
    if (msg.includes(key)) return val;
  }
  return msg;
}

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Veuillez saisir votre nom.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setLoading(true);

    if (mode === 'login') {
      const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (e) setError(friendlyError(e.message));
    } else {
      const { error: e } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() } },
      });
      if (e) {
        setError(friendlyError(e.message));
      } else {
        setSuccess('Compte créé ! Vous êtes maintenant connecté.');
      }
    }

    setLoading(false);
  }

  function switchMode(m: Mode) {
    setMode(m);
    setError('');
    setSuccess('');
    setEmail('');
    setPassword('');
    setName('');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-500 rounded-2xl shadow-lg shadow-sky-500/30 mb-4">
            <BookOpen size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">BiblioGest</h1>
          <p className="text-slate-400 text-sm mt-1">Système de gestion de bibliothèque</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-white/10">
            {(['login', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-3.5 text-sm font-semibold transition-all duration-200 ${
                  mode === m
                    ? 'text-sky-400 border-b-2 border-sky-400 bg-sky-500/5'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m === 'login' ? 'Connexion' : 'Créer un compte'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="p-8 space-y-5">
            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                <p className="text-sm text-emerald-300">{success}</p>
              </div>
            )}

            {/* Name (signup only) */}
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Nom complet
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Prénom Nom"
                    autoComplete="name"
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">
                Adresse e-mail
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.fr"
                  autoComplete="email"
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">
                Mot de passe
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Minimum 6 caractères' : '••••••••'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl pl-10 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-white font-semibold py-3 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === 'login' ? 'Connexion…' : 'Création…'}
                </span>
              ) : mode === 'login' ? (
                'Se connecter'
              ) : (
                'Créer le compte'
              )}
            </button>

            {/* Switch hint */}
            <p className="text-center text-xs text-slate-500 pt-1">
              {mode === 'login' ? (
                <>
                  Pas encore de compte ?{' '}
                  <button type="button" onClick={() => switchMode('signup')} className="text-sky-400 hover:text-sky-300 font-medium">
                    Créer un compte
                  </button>
                </>
              ) : (
                <>
                  Déjà inscrit ?{' '}
                  <button type="button" onClick={() => switchMode('login')} className="text-sky-400 hover:text-sky-300 font-medium">
                    Se connecter
                  </button>
                </>
              )}
            </p>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Accès réservé au personnel de la bibliothèque
        </p>
      </div>
    </div>
  );
}
