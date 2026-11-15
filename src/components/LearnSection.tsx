import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { LESSON_TOPICS } from '../data/lessons';
import { validateMathAnswer } from '../lib/mathEngine';
import type { MathQuestion } from '../types/game';

type LearnTab = 'steps' | 'examples' | 'practice';

export const LearnSection: React.FC = () => {
  const [activeTopicId, setActiveTopicId] = useState(LESSON_TOPICS[0].id);
  const [activeTab, setActiveTab] = useState<LearnTab>('steps');
  const topic = LESSON_TOPICS.find((t) => t.id === activeTopicId) || LESSON_TOPICS[0];

  const [exercise, setExercise] = useState<MathQuestion>(() => topic.generateExercise());
  const [ansA, setAnsA] = useState('');
  const [ansB, setAnsB] = useState('');
  const [activeField, setActiveField] = useState<'a' | 'b'>('a');
  const [exerciseResult, setExerciseResult] = useState<'idle' | 'correct' | 'wrong'>('idle');

  const handleSelectTopic = (id: string) => {
    const nextTopic = LESSON_TOPICS.find((t) => t.id === id) || LESSON_TOPICS[0];
    setActiveTopicId(nextTopic.id);
    setExercise(nextTopic.generateExercise());
    setAnsA('');
    setAnsB('');
    setActiveField('a');
    setExerciseResult('idle');
  };

  const handleNewExercise = () => {
    setExercise(topic.generateExercise());
    setAnsA('');
    setAnsB('');
    setActiveField('a');
    setExerciseResult('idle');
  };

  const handleCheckExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ansA.trim() && !ansB.trim()) return;
    const ok = validateMathAnswer(exercise, ansA, ansB);
    setExerciseResult(ok ? 'correct' : 'wrong');
  };

  const insertMathSymbol = (symbol: string) => {
    const target = exercise.kind === 'single' ? 'a' : activeField;
    const apply = (prev: string) => {
      if (symbol === '-') {
        return prev.startsWith('-') ? prev.slice(1) : `-${prev}`;
      }
      return `${prev}${symbol}`;
    };
    if (target === 'a') {
      setAnsA(apply);
    } else {
      setAnsB(apply);
    }
  };

  const tabs: { id: LearnTab; label: string }[] = [
    { id: 'steps', label: 'Como fazer' },
    { id: 'examples', label: 'Exemplos' },
    { id: 'practice', label: 'Praticar' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5">
      {/* Minimalist Top Bar: Title + Segmented Mode Control */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Aprender
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Guias diretos e prática rápida por tema.
          </p>
        </div>

        <div className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
        {/* Clean Unboxed Topic Index */}
        <aside className="lg:col-span-3 min-w-0 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-1 gap-1">
          {LESSON_TOPICS.map((item) => {
            const active = item.id === topic.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTopic(item.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2.5 cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <span
                  className={`text-[11px] font-mono tabular-nums shrink-0 ${
                    active ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {item.order}
                </span>
                <span className="text-xs sm:text-sm font-semibold truncate">{item.title}</span>
              </button>
            );
          })}
        </aside>

        {/* Single Clean Content Surface — No Nested Cards */}
        <div className="lg:col-span-9 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${topic.id}-${activeTab}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14 }}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6"
            >
              {/* Topic Header */}
              <div className="pb-4 border-b border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-50">
                  {topic.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {topic.summary}
                </p>
              </div>

              {/* TAB 1: Como fazer (Whitespace + Hairlines) */}
              {activeTab === 'steps' && (
                <div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {topic.steps.map((step, idx) => (
                      <div key={step.title} className="py-3.5 first:pt-4 last:pb-3 space-y-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1.5">
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            <span className="font-mono text-blue-600 dark:text-blue-400 mr-2">
                              {idx + 1}.
                            </span>
                            {step.title}
                          </p>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                          {step.description}
                        </p>
                        {step.formula && (
                          <p className="pt-0.5 text-xs sm:text-sm font-mono font-medium text-blue-700 dark:text-blue-300 break-words">
                            {step.formula}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 pt-3.5 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        Dica:
                      </span>{' '}
                      {topic.tip}
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('practice')}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      <span>Praticar agora</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: Exemplos */}
              {activeTab === 'examples' && (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200/80 dark:divide-slate-800">
                    {topic.examples.map((ex, idx) => (
                      <div
                        key={ex.title}
                        className={`py-4 md:py-4 ${
                          idx === 0 ? 'md:pr-6' : 'md:pl-6'
                        } space-y-3`}
                      >
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{ex.title}</p>
                          <p className="mt-0.5 text-lg font-bold font-mono text-slate-900 dark:text-slate-50">
                            {ex.problem}
                          </p>
                        </div>

                        <ol className="space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          {ex.steps.map((s, sIdx) => (
                            <li key={s} className="flex gap-2">
                              <span className="font-mono text-slate-400 shrink-0">{sIdx + 1}.</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ol>

                        <p className="pt-1 text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          = {ex.answer}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3.5 border-t border-slate-200/80 dark:border-slate-800 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveTab('practice')}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>Testar em um exercício</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: Praticar */}
              {activeTab === 'practice' && (
                <div className="pt-4 space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {exercise.helperLabel}
                    </p>
                    <button
                      type="button"
                      onClick={handleNewExercise}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Trocar</span>
                    </button>
                  </div>

                  <div className="py-4 text-center space-y-1">
                    <p className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
                      {exercise.prompt}
                    </p>
                    {exercise.secondaryPrompt && (
                      <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200">
                        {exercise.secondaryPrompt}
                      </p>
                    )}
                  </div>

                  <form
                    onSubmit={handleCheckExercise}
                    className="max-w-md mx-auto space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      {exercise.kind === 'single' ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          enterKeyHint="done"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck={false}
                          value={ansA}
                          onFocus={() => setActiveField('a')}
                          onChange={(e) => setAnsA(e.target.value)}
                          placeholder="Digite o resultado..."
                          className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-base font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      ) : (
                        <>
                          <input
                            type="text"
                            inputMode="decimal"
                            enterKeyHint="next"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                            value={ansA}
                            onFocus={() => setActiveField('a')}
                            onChange={(e) => setAnsA(e.target.value)}
                            placeholder={exercise.kind === 'system_xy' ? 'x =' : 'x₁ ='}
                            className="flex-1 min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-base font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                          <input
                            type="text"
                            inputMode="decimal"
                            enterKeyHint="done"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                            value={ansB}
                            onFocus={() => setActiveField('b')}
                            onChange={(e) => setAnsB(e.target.value)}
                            placeholder={exercise.kind === 'system_xy' ? 'y =' : 'x₂ ='}
                            className="flex-1 min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-base font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                        </>
                      )}
                      <button
                        type="submit"
                        onMouseDown={(e) => e.preventDefault()}
                        className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer touch-manipulation"
                      >
                        Verificar
                      </button>
                    </div>

                    {/* Quick math symbols for mobile decimal keyboards that omit minus/slash */}
                    <div className="flex sm:hidden items-center justify-center gap-2">
                      {[
                        { symbol: '-', label: '+/−' },
                        { symbol: ',', label: ',' },
                        { symbol: '/', label: '/' },
                      ].map((item) => (
                        <button
                          key={item.symbol}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => insertMathSymbol(item.symbol)}
                          className="min-h-[40px] px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono text-sm font-bold cursor-pointer touch-manipulation"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </form>

                  <div className="min-h-[44px] flex items-center justify-center">
                    {exerciseResult !== 'idle' && (
                      <div
                        className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex flex-wrap items-center justify-center gap-3 ${
                          exerciseResult === 'correct'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {exerciseResult === 'correct' ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                              <span>Correto! ({exercise.formattedAnswer})</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 shrink-0" />
                              <span>Resposta esperada: {exercise.formattedAnswer}</span>
                            </>
                          )}
                        </span>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={handleNewExercise}
                          className="underline font-bold cursor-pointer touch-manipulation"
                        >
                          Próximo →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
