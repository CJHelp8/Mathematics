import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { ArrowRight, Award, Brain, Calculator, ShieldCheck } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';

export const AuthGate: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao autenticar.';
      if (msg.includes('popup-closed-by-user')) {
        setErrorMsg('Login cancelado. Clique novamente para entrar com sua conta Google.');
      } else {
        setErrorMsg('Não foi possível concluir o login. Verifique se pop-ups estão permitidos.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left editorial overview */}
        <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div>
            <div className="flex items-center gap-3">
              <img
                src="/assets/aistudio/file_000000009194820ebfecf5aa31ce0c44_f2f94ca7.png"
                alt="Axioma"
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-slate-700 bg-slate-950 shrink-0"
              />
              <p className="text-xs font-mono uppercase tracking-widest text-blue-600 dark:text-blue-400 font-semibold">
                Axioma · Arena de Matemática
              </p>
            </div>
            <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 text-balance">
              Treine cálculo mental, equações e suba no ranking competitivo.
            </h1>
            <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Resolva desafios cronometrados, acumule XP sem limite de nível e acompanhe sua evolução de Elo de 0 a 3.000 com histórico salvo na nuvem.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="space-y-1.5">
              <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Ranked & Elo</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                6 patentes de Bronze até Supremo.
              </p>
            </div>
            <div className="space-y-1.5">
              <Brain className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Cálculo Mental</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                10s por questão em fluxo infinito de agilidade.
              </p>
            </div>
            <div className="space-y-1.5">
              <Calculator className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Equações & Ensino</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                1º e 2º grau, sistemas e lições interativas.
              </p>
            </div>
          </div>
        </div>

        {/* Right authentication card */}
        <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
              Acesse sua conta
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Crie sua conta automaticamente no primeiro acesso ou entre para continuar de onde parou em qualquer dispositivo.
            </p>

            <div className="mt-8 space-y-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <span>{loading ? 'Conectando...' : 'Entrar ou cadastrar com Google'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-400">
                  {errorMsg}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Seu perfil, Elo, nível, histórico de partidas e preferências são salvos de forma permanente em banco de dados seguro.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
