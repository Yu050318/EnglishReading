import React, { ChangeEvent, KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useState } from 'react';
import { NavLink, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom';
import { availableCategories, categoryLabel } from './data/categories';
import type { OptionKey, Question, SubjectId } from './data/questionSchema';
import { normalizeQuestionCollection, validateQuestionCollection } from './data/questionSchema';
import { normalizeSubject, questionsForSubject, subjectLabel, subjectOrder } from './data/subjects';
import { buildMemorizeQueue, clampMemorizeIndex, parseMemorizeJump } from './features/memorize/memorize';
import { buildQueue, filterQuestions, isCorrect } from './features/practice/practice';
import { cloudStatusLabel, useCloudSync } from './store/useCloudSync';
import { emptyState, loadState, recordAnswer, resolveStorage, saveState, stats, type State } from './store/store';

const merged = (base: Question[], state: State): Question[] => {
  const map = new Map<string, Question>();
  [...base, ...normalizeQuestionCollection(state.importedQuestions)].forEach((question) => map.set(question.id, question));
  Object.values(state.questionOverrides).forEach((question) => map.set(question.id, normalizeQuestionCollection([question])[0]));
  return [...map.values()].filter((question) => question.reviewStatus === 'verified');
};

const subjectPath = (path: string, subject: SubjectId): string => `${path}?subject=${subject}`;
const questionAnswerText = (question: Question): string =>
  question.answerText || question.answer.map((key) => question.options.find((option) => option.key === key)?.text ?? key).join('；');

function useCurrentSubject(): SubjectId {
  const [params] = useSearchParams();
  return normalizeSubject(params.get('subject'));
}

function scopedState(state: State, questions: Question[]): State {
  const ids = new Set(questions.map((question) => question.id));
  return {
    ...state,
    progress: Object.fromEntries(Object.entries(state.progress).filter(([id]) => ids.has(id))),
    mistakeIds: state.mistakeIds.filter((id) => ids.has(id)),
    favoriteIds: state.favoriteIds.filter((id) => ids.has(id)),
  };
}

export default function App() {
  const storage = useMemo(() => resolveStorage(() => localStorage), []);
  const [base, setBase] = useState<Question[]>([]);
  const [error, setError] = useState('');
  const [state, setState] = useState<State>(() => (storage ? loadState(storage) : emptyState()));
  const [storageOk, setStorageOk] = useState(storage !== null);
  const cloudStatus = useCloudSync(storage, state, setState);

  useEffect(() => {
    fetch('./questions.json')
      .then((response) => {
        if (!response.ok) throw new Error('load failed');
        return response.json();
      })
      .then((raw) => setBase(normalizeQuestionCollection(raw)))
      .catch(() => setError('题库加载失败，请刷新页面，或在题库管理中导入备份。'));
  }, []);

  useEffect(() => {
    if (storage) setStorageOk(saveState(storage, state));
  }, [state, storage]);

  const questions = useMemo(() => merged(base, state), [base, state]);

  return (
    <>
      <header>
        <NavLink className="brand" to="/">
          <span>阅读</span>
          <small>MULTI SUBJECT QUIZ</small>
        </NavLink>
        <nav>
          {[
            ['/', '首页'],
            ['/practice', '练习'],
            ['/memorize', '背题'],
            ['/mistakes', '错题'],
            ['/favorites', '收藏'],
            ['/library', '题库'],
          ].map(([to, text]) => <NavLink key={to} to={to}>{text}</NavLink>)}
        </nav>
      </header>
      {(!storageOk || error) && <div className="alert">{error || '浏览器存储不可用，记录可能无法保存。请关闭隐私模式或导出备份。'}</div>}
      {cloudStatus !== 'disabled' && <div className="notice">云同步：{cloudStatusLabel[cloudStatus]}</div>}
      <main>
        <Routes>
          <Route path="/" element={<Dashboard questions={questions} state={state} />} />
          <Route path="/practice" element={<Practice questions={questions} state={state} setState={setState} />} />
          <Route path="/memorize" element={<Memorize questions={questions} state={state} setState={setState} />} />
          <Route path="/mistakes" element={<Collection title="错题本" empty="这个科目还没有错题，去练几道吧。" ids={state.mistakeIds} questions={questions} remove={(id) => setState((current) => ({ ...current, mistakeIds: current.mistakeIds.filter((item) => item !== id) }))} />} />
          <Route path="/favorites" element={<Collection title="收藏夹" empty="这个科目收藏的题目会出现在这里。" ids={state.favoriteIds} questions={questions} remove={(id) => setState((current) => ({ ...current, favoriteIds: current.favoriteIds.filter((item) => item !== id) }))} />} />
          <Route path="/library" element={<Library base={base} state={state} setState={setState} />} />
        </Routes>
      </main>
      <footer>记录保存在你的浏览器，并可通过云同步保存普通 JSON 状态。</footer>
    </>
  );
}

function Dashboard({ questions, state }: { questions: Question[]; state: State }) {
  return (
    <section className="dashboard">
      <div className="hero">
        <p className="eyebrow">STUDY DESK</p>
        <h1>选择科目，<br /><em>开始刷题。</em></h1>
        <p>英语与人力资源题库分开统计、分开练习、分开背题。</p>
      </div>
      <aside className="note">
        <b>学习便笺</b>
        <span>主观题会进入背题和题库管理，不进入自动判分练习队列。</span>
      </aside>
      <div className="subject-grid">
        {subjectOrder.map((subject) => {
          const subjectQuestions = questionsForSubject(questions, subject);
          const data = stats(scopedState(state, subjectQuestions), subjectQuestions.length);
          return (
            <article className="subject-card card" key={subject}>
              <p className="eyebrow">{subject.toUpperCase()}</p>
              <h2>{subjectLabel[subject]}</h2>
              <div className="subject-stats">
                <span>{data.total} 题</span>
                <span>已练 {data.practiced}</span>
                <span>正确率 {data.accuracy}%</span>
              </div>
              <div className="actions">
                <NavLink className="button primary" to={subjectPath('/practice', subject)}>练习</NavLink>
                <NavLink className="button" to={subjectPath('/memorize', subject)}>背题</NavLink>
                <NavLink className="button" to={`/practice?subject=${subject}&random=1&count=10`}>随机 10 题</NavLink>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SubjectHead({ over, title, subject }: { over: string; title: string; subject: SubjectId }) {
  return (
    <div className="pagehead">
      <p className="eyebrow">{over}</p>
      <h1>{title}</h1>
      <p className="subject-current">当前科目：{subjectLabel[subject]} · <NavLink to="/">切换科目</NavLink></p>
    </div>
  );
}

function Practice({ questions, state, setState }: { questions: Question[]; state: State; setState: (fn: (current: State) => State) => void }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const subject = normalizeSubject(params.get('subject'));
  const subjectQuestions = questionsForSubject(questions, subject);
  const [category, setCategory] = useState('');
  const [count, setCount] = useState(params.get('count') || '10');
  const [queue, setQueue] = useState<Question[]>([]);
  const [index, setIndex] = useState(-1);
  const [selected, setSelected] = useState<OptionKey[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const random = params.get('random') === '1';
  const current = queue[index];

  useEffect(() => {
    setIndex(-1);
    setSelected([]);
    setSubmitted(false);
    setCategory('');
  }, [subject]);

  const start = () => {
    const filtered = filterQuestions(subjectQuestions, { category, subject });
    setQueue(buildQueue(filtered, random, count === 'all' ? 'all' : Number(count)));
    setIndex(0);
    setScore(0);
    setSelected([]);
    setSubmitted(false);
  };
  const toggleSelected = (key: OptionKey) => {
    if (!current || submitted) return;
    setSelected((items) => current.type === 'multiple_choice'
      ? (items.includes(key) ? items.filter((item) => item !== key) : [...items, key])
      : [key]);
  };
  const submit = () => {
    if (!current || !selected.length) return;
    const ok = isCorrect(current, selected);
    setSubmitted(true);
    if (ok) setScore((value) => value + 1);
    setState((currentState) => recordAnswer(currentState, current.id, ok));
  };
  const next = () => {
    setIndex((value) => value + 1);
    setSelected([]);
    setSubmitted(false);
  };

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (!current) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(tag ?? '')) return;
      const key = event.key.toUpperCase();
      const optionIndex = /^[1-4]$/.test(key) ? Number(key) - 1 : current.options.findIndex((option) => option.key === key);
      if (!submitted && optionIndex >= 0 && current.options[optionIndex]) toggleSelected(current.options[optionIndex].key);
      if (event.key === 'Enter' && (selected.length || submitted)) (submitted ? next : submit)();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [current, submitted, selected]);

  if (index < 0) {
    const objectiveCount = subjectQuestions.filter((question) => question.type !== 'short_answer').length;
    return (
      <section>
        <SubjectHead over="PRACTICE SETUP" title={random ? '随机练习' : '顺序练习'} subject={subject} />
        <div className="setup card">
          <p>本科目可自动判分题目：{objectiveCount} 题。主观题请到背题模式查看参考答案。</p>
          <label>类别
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">全部类别</option>
              {availableCategories(subjectQuestions).map((key) => <option key={key} value={key}>{categoryLabel[key]}</option>)}
            </select>
          </label>
          <label>题量
            <select value={count} onChange={(event) => setCount(event.target.value)}>
              {['10', '20', '40', 'all'].map((value) => <option key={value} value={value}>{value === 'all' ? '全部' : `${value} 题`}</option>)}
            </select>
          </label>
          <button className="button primary" onClick={start} disabled={!objectiveCount}>开始练习</button>
        </div>
      </section>
    );
  }

  if (index >= queue.length) {
    return (
      <section className="finish card">
        <p className="eyebrow">ROUND COMPLETE</p>
        <h1>{score} / {queue.length}</h1>
        <p>本轮正确率 {queue.length ? Math.round((score / queue.length) * 100) : 0}%</p>
        <button className="button primary" onClick={() => setIndex(-1)}>再来一轮</button>
        <button className="button" onClick={() => navigate('/')}>返回首页</button>
      </section>
    );
  }

  const ok = submitted && isCorrect(current, selected);
  return (
    <section className="practice">
      <div className="progress"><span style={{ width: `${((index + 1) / queue.length) * 100}%` }} /></div>
      <div className="questionmeta">
        <span>{index + 1} / {queue.length}</span>
        <span>{subjectLabel[subject]}</span>
        <span>{categoryLabel[current.category]}</span>
        <button className="star" aria-label="收藏" onClick={() => setState((currentState) => ({ ...currentState, favoriteIds: currentState.favoriteIds.includes(current.id) ? currentState.favoriteIds.filter((id) => id !== current.id) : [...currentState.favoriteIds, current.id] }))}>{state.favoriteIds.includes(current.id) ? '★' : '☆'}</button>
      </div>
      <h2>{current.question}</h2>
      {current.type === 'multiple_choice' && <p className="hint">不定项选择题：可选择多个选项，完全匹配才算正确。</p>}
      <div className="options">
        {current.options.map((option, optionIndex) => {
          const picked = selected.includes(option.key);
          const right = submitted && current.answer.includes(option.key);
          const wrong = submitted && picked && !right;
          return (
            <button key={option.key} disabled={submitted} className={`${picked ? 'picked ' : ''}${right ? 'right ' : ''}${wrong ? 'wrong' : ''}`} onClick={() => toggleSelected(option.key)}>
              <b>{optionIndex + 1}</b>
              <span>{option.text}</span>
            </button>
          );
        })}
      </div>
      {submitted && (
        <div className={`feedback ${ok ? 'ok' : 'no'}`}>
          <strong>{ok ? '回答正确' : '再看一眼'}</strong>
          <span>正确答案：{current.answer.join('、')} {questionAnswerText(current)}</span>
          {current.explanation && <p>{current.explanation}</p>}
        </div>
      )}
      <button className="button primary submit" disabled={!selected.length && !submitted} onClick={submitted ? next : submit}>{submitted ? (index + 1 === queue.length ? '查看结果' : '下一题 →') : '提交答案'}</button>
    </section>
  );
}

function Memorize({ questions, state, setState }: { questions: Question[]; state: State; setState: (fn: (current: State) => State) => void }) {
  const subject = useCurrentSubject();
  const subjectQuestions = questionsForSubject(questions, subject);
  const [category, setCategory] = useState('');
  const [index, setIndex] = useState(0);
  const [jumpValue, setJumpValue] = useState('1');
  const [jumpError, setJumpError] = useState('');
  const queue = useMemo(() => buildMemorizeQueue(subjectQuestions, category), [subjectQuestions, category]);
  const safeIndex = clampMemorizeIndex(index, queue.length);
  const current = queue[safeIndex];

  const goToIndex = (nextIndex: number) => {
    const next = clampMemorizeIndex(nextIndex, queue.length);
    setIndex(next);
    setJumpValue(queue.length ? String(next + 1) : '');
    setJumpError('');
  };
  const move = (delta: number) => goToIndex(safeIndex + delta);
  const jump = () => {
    const result = parseMemorizeJump(jumpValue, queue.length);
    if (!result.ok) {
      setJumpError(`请输入 1～${queue.length} 的整数`);
      return;
    }
    goToIndex(result.index);
  };

  useEffect(() => {
    setIndex(0);
    setJumpValue(queue.length ? '1' : '');
    setJumpError('');
  }, [subject, category, queue.length]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(tag ?? '')) return;
      if (event.key === 'ArrowLeft') move(-1);
      if (event.key === 'ArrowRight') move(1);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [queue.length, safeIndex]);

  return (
    <section className="memorize">
      <SubjectHead over="MEMORIZE" title="背题模式" subject={subject} />
      <div className="memorize-controls">
        <label>类别
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">全部类别</option>
            {availableCategories(subjectQuestions).map((key) => <option key={key} value={key}>{categoryLabel[key]}</option>)}
          </select>
        </label>
        <div className="memorize-jump">
          <label htmlFor="memorize-question-number">跳到第几题</label>
          <div className="memorize-jump-row">
            <input id="memorize-question-number" type="number" inputMode="numeric" min={1} max={queue.length || 1} step={1} value={jumpValue} disabled={!queue.length} aria-invalid={Boolean(jumpError)} aria-describedby={jumpError ? 'memorize-jump-error' : undefined} onChange={(event) => setJumpValue(event.target.value)} onKeyDown={(event: ReactKeyboardEvent<HTMLInputElement>) => { if (event.key === 'Enter') jump(); if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') event.stopPropagation(); }} />
            <button className="button" disabled={!queue.length} onClick={jump}>跳转</button>
          </div>
          {jumpError && <small id="memorize-jump-error" className="field-error">{jumpError}</small>}
        </div>
        <span>{queue.length ? `${safeIndex + 1} / ${queue.length}` : '0 / 0'}</span>
      </div>
      {!subjectQuestions.length ? <div className="empty">这个科目暂无题目。</div> : !current ? <div className="empty">这个分类暂时没有题目。</div> : (
        <article className="memorize-card card">
          <div className="questionmeta">
            <span>{subjectLabel[subject]}</span>
            <span>{categoryLabel[current.category]}</span>
            <span>{current.source.join('、')}</span>
            <button className="star" aria-label="收藏" onClick={() => setState((currentState) => ({ ...currentState, favoriteIds: currentState.favoriteIds.includes(current.id) ? currentState.favoriteIds.filter((id) => id !== current.id) : [...currentState.favoriteIds, current.id] }))}>{state.favoriteIds.includes(current.id) ? '★' : '☆'}</button>
          </div>
          <h2>{current.question}</h2>
          {current.options.length > 0 && (
            <div className="memorize-options">
              {current.options.map((option) => <div key={option.key} className={`memorize-option ${current.answer.includes(option.key) ? 'correct' : ''}`}><b>{option.key}</b><span>{option.text}</span>{current.answer.includes(option.key) && <em>正确</em>}</div>)}
            </div>
          )}
          <div className="memorize-answer">
            <strong>{current.type === 'short_answer' ? '参考答案' : `正确答案：${current.answer.join('、')}`}</strong>
            <span>{questionAnswerText(current)}</span>
            {current.explanation && <p>{current.explanation}</p>}
          </div>
          <div className="memorize-actions">
            <button className="button" disabled={safeIndex === 0} onClick={() => move(-1)}>← 上一题</button>
            <button className="button primary" disabled={safeIndex === queue.length - 1} onClick={() => move(1)}>下一题 →</button>
          </div>
        </article>
      )}
    </section>
  );
}

function Collection({ title, empty, ids, questions, remove }: { title: string; empty: string; ids: string[]; questions: Question[]; remove: (id: string) => void }) {
  const subject = useCurrentSubject();
  const items = questionsForSubject(questions, subject).filter((question) => ids.includes(question.id));
  return (
    <section>
      <SubjectHead over="REVIEW" title={title} subject={subject} />
      {!items.length ? <div className="empty">{empty}</div> : (
        <div className="list">
          {items.map((question) => <article className="card" key={question.id}><span className="tag">{categoryLabel[question.category]}</span><h3>{question.question}</h3><p>{question.type === 'short_answer' ? '参考答案' : '答案'}：{questionAnswerText(question)}</p><button className="textbutton" onClick={() => remove(question.id)}>从{title}移除</button></article>)}
        </div>
      )}
    </section>
  );
}

function Library({ base, state, setState }: { base: Question[]; state: State; setState: (fn: (current: State) => State) => void }) {
  const subject = useCurrentSubject();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Question | null>(null);
  const [notice, setNotice] = useState('');
  const all = [...new Map([...base, ...normalizeQuestionCollection(state.importedQuestions), ...Object.values(state.questionOverrides).map((question) => normalizeQuestionCollection([question])[0])].map((question) => [question.id, question])).values()];
  const scoped = questionsForSubject(all, subject);
  const shown = scoped.filter((question) => !search || question.question.toLowerCase().includes(search.toLowerCase()));

  const exportJson = () => {
    const anchor = document.createElement('a');
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, questions: all, progress: state.progress, orphanedRecords: state.orphanedRecords }, null, 2)], { type: 'application/json' }));
    anchor.href = url;
    anchor.download = 'quiz-backup.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      const raw = JSON.parse(await file.text()) as unknown;
      const candidate = Array.isArray(raw) ? raw : (raw as { questions?: unknown }).questions;
      const validation = validateQuestionCollection(candidate);
      if (!validation.ok) throw new Error(validation.errors.slice(0, 3).join('；'));
      const normalized = normalizeQuestionCollection(candidate);
      const known = new Set(all.map((question) => question.id));
      const added = normalized.filter((question) => !known.has(question.id)).length;
      if (confirm(`导入预览：新增 ${added}，更新 ${normalized.length - added}，无效 0。确认导入？`)) {
        setState((current) => ({ ...current, importedQuestions: normalized }));
        setNotice('导入完成。');
      }
    } catch (error) {
      setNotice(`导入失败：${error instanceof Error ? error.message : 'JSON 无效'}`);
    }
  };

  const updateAnswer = (value: string) => {
    if (!editing) return;
    const answer = value.toUpperCase().replace(/[^A-DTF]/g, '').split('') as OptionKey[];
    setEditing({ ...editing, answer: [...new Set(answer)] });
  };

  return (
    <section>
      <SubjectHead over="LOCAL LIBRARY" title="题库管理" subject={subject} />
      <p>编辑只保存在当前浏览器，不会修改内置文件。旧 JSON 没有 subject 时会按英语导入。</p>
      <div className="toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索题干…" />
        <label className="button">导入 JSON<input hidden type="file" accept="application/json" onChange={importJson} /></label>
        <button className="button" onClick={exportJson}>导出备份</button>
        <button className="textbutton danger" onClick={() => confirm('只清除本地题库覆盖？进度、错题和收藏会保留。') && setState((current) => ({ ...current, questionOverrides: {}, importedQuestions: [] }))}>恢复内置题库</button>
      </div>
      {notice && <div className="notice">{notice}</div>}
      {editing && (
        <div className="editor card">
          <h2>本地校对</h2>
          <label>题干<textarea value={editing.question} onChange={(event) => setEditing({ ...editing, question: event.target.value })} /></label>
          {editing.options.map((option, optionIndex) => <label key={option.key}>选项 {option.key}<input value={option.text} onChange={(event) => setEditing({ ...editing, options: editing.options.map((item, index) => index === optionIndex ? { ...item, text: event.target.value } : item) })} /></label>)}
          {editing.type === 'short_answer'
            ? <label>参考答案<textarea value={editing.answerText ?? ''} onChange={(event) => setEditing({ ...editing, answerText: event.target.value })} /></label>
            : <label>答案<input value={editing.answer.join('')} onChange={(event) => updateAnswer(event.target.value)} placeholder="如 A 或 BD" /></label>}
          <label>类别
            <select value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value as Question['category'] })}>
              {Object.entries(categoryLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label>解析<textarea value={editing.explanation} onChange={(event) => setEditing({ ...editing, explanation: event.target.value })} /></label>
          <label>状态
            <select value={editing.reviewStatus} onChange={(event) => setEditing({ ...editing, reviewStatus: event.target.value as Question['reviewStatus'] })}>
              <option value="verified">已校对</option>
              <option value="needs_review">待校对</option>
            </select>
          </label>
          <button className="button primary" onClick={() => { setState((current) => ({ ...current, questionOverrides: { ...current.questionOverrides, [editing.id]: editing } })); setEditing(null); setNotice('本地校对已保存。'); }}>保存覆盖</button>
          <button className="button" onClick={() => setEditing(null)}>取消</button>
        </div>
      )}
      <div className="librarytable">
        {shown.slice(0, 160).map((question) => <article key={question.id}><div><span className="tag">{categoryLabel[question.category]}</span><small>{question.source.join('、')} · {question.reviewStatus === 'verified' ? '已校对' : '待校对'}</small><h3>{question.question}</h3>{question.type === 'short_answer' && <p>参考答案：{question.answerText}</p>}</div><button className="textbutton" onClick={() => setEditing(structuredClone(question))}>编辑</button></article>)}
      </div>
    </section>
  );
}
