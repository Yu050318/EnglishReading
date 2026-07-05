import type { Question } from '../../data/questionSchema';
export interface Filters { category?: string; source?: string; search?: string }
export function filterQuestions(items: Question[], filters: Filters): Question[] { const s=filters.search?.trim().toLowerCase(); return items.filter(q=>(!filters.category||q.category===filters.category)&&(!filters.source||q.source.some(x=>x.includes(filters.source!)))&&(!s||q.question.toLowerCase().includes(s))); }
export function buildQueue(items: Question[], random: boolean, count: number|'all'): Question[] { const out=[...items]; if(random)for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return count==='all'?out:out.slice(0,count); }
export function isCorrect(q:Question,selected:string[]):boolean{return[...q.answer].sort().join('|')===[...selected].sort().join('|')}
