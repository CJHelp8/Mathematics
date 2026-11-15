import React, { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { Check, LogOut, Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import { auth } from '../lib/firebase';
import { updateProfileIdentity, updateUserPreferences } from '../services/userService';
import type { Difficulty, ThemeMode, UserPreferences, UserProfile } from '../types/game';
import { AvatarEditor } from './AvatarEditor';

interface SettingsPageProps {
  profile: UserProfile;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ profile }) => {
  const [name, setName] = useState(profile.displayName);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  useEffect(() => {
    setName(profile.displayName);
  }, [profile.displayName]);

  const showSavedNotice = (msg = 'Alterações salvas automaticamente') => {
    setSaveBanner(msg);
    window.setTimeout(() => {
      setSaveBanner((prev) => (prev === msg ? null : prev));
    }, 2200);
  };

  const handleNameBlurOrSave = async (nextName: string) => {
    const trimmed = nextName.trim();
    if (trimmed.length < 2 || trimmed === profile.displayName) return;
    await updateProfileIdentity(profile.uid, trimmed, profile.photoUrl);
    showSavedNotice('Nome salvo automaticamente');
  };

  const handlePhotoChange = async (newUrl: string) => {
    await updateProfileIdentity(profile.uid, profile.displayName, newUrl);
    showSavedNotice(newUrl ? 'Foto atualizada' : 'Foto removida');
  };

  const updatePref = async (patch: Partial<UserPreferences>) => {
    const nextPrefs: UserPreferences = {
      ...profile.preferences,
      ...patch,
    };
    await updateUserPreferences(profile.uid, nextPrefs);
    showSavedNotice();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Configurações
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Todas as alterações são salvas automaticamente na sua conta.
          </p>
        </div>

        {saveBanner && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <Check className="w-3.5 h-3.5" />
            <span>{saveBanner}</span>
          </div>
        )}
      </div>

      {/* 2-Column Layout to avoid vertical scrolling */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: Perfil */}
        <section className="lg:col-span-6 min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Perfil</h2>

          <div className="space-y-1.5">
            <label
              htmlFor="settings-name"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
            >
              Nome do usuário
            </label>
            <div className="flex gap-2">
              <input
                id="settings-name"
                type="text"
                maxLength={40}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => void handleNameBlurOrSave(name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleNameBlurOrSave(name);
                  }
                }}
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={() => void handleNameBlurOrSave(name)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Aplicar
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Foto de perfil
            </p>
            <AvatarEditor
              currentPhotoUrl={profile.photoUrl}
              onSelectPhoto={handlePhotoChange}
            />
          </div>
        </section>

        {/* Right Column: Aparência, Preferências e Conta */}
        <div className="lg:col-span-6 min-w-0 flex flex-col justify-between gap-4">
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Aparência</h2>
            <div className="grid grid-cols-2 gap-3">
              {([
                { id: 'light', label: 'Modo Claro', icon: Sun },
                { id: 'dark', label: 'Modo Escuro', icon: Moon },
              ] as { id: ThemeMode; label: string; icon: React.FC<{ className?: string }> }[]).map(
                (opt) => {
                  const Icon = opt.icon;
                  const active = profile.preferences.theme === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => void updatePref({ theme: opt.id })}
                      className={`py-2.5 px-4 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                        active
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{opt.label}</span>
                    </button>
                  );
                }
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Preferências da Plataforma
            </h2>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                {profile.preferences.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                )}
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Efeitos sonoros
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Feedback discreto ao responder.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={profile.preferences.soundEnabled}
                onClick={() =>
                  void updatePref({ soundEnabled: !profile.preferences.soundEnabled })
                }
                className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                  profile.preferences.soundEnabled
                    ? 'bg-blue-600'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    profile.preferences.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Alerta visual nos últimos 10s
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Destaca o cronômetro no final.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={profile.preferences.showTimerWarning}
                onClick={() =>
                  void updatePref({ showTimerWarning: !profile.preferences.showTimerWarning })
                }
                className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                  profile.preferences.showTimerWarning
                    ? 'bg-blue-600'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    profile.preferences.showTimerWarning ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Dificuldade padrão do Modo Mental
              </p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'facil', label: 'Fácil' },
                  { id: 'normal', label: 'Normal' },
                  { id: 'dificil', label: 'Difícil' },
                ] as { id: Difficulty; label: string }[]).map((d) => {
                  const active = profile.preferences.mentalDefaultDifficulty === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => void updatePref({ mentalDefaultDifficulty: d.id })}
                      className={`py-1.5 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                        active
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Conta</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Seu progresso permanece salvo na nuvem.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void signOut(auth)}
              className="px-4 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair da conta</span>
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};
