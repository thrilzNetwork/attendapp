'use client';
/* eslint-disable */

import { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap, Search, Briefcase, ChevronDown, ChevronUp,
  ExternalLink, Plus, Trash2,
} from 'lucide-react';
import {
  listCourses, createCourse, deleteCourse,
  listModules, createModule, deleteModule,
  listQuizQuestions, createQuizQuestion,
  listModuleCompletions, recordModuleCompletion,
  listQuizAttempts, recordQuizAttempt,
  listHrDocuments,
  type OpRecord,
  type ModuleCompletion, type QuizAttempt,
} from '@/lib/opsStore';

// ── HR Documents ──
function HRDocumentsView({ hotelId }: { hotelId: string }) {
  const [docs, setDocs] = useState<OpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const d = await listHrDocuments(hotelId);
      setDocs(d || []);
      setLoading(false);
    })();
  }, [hotelId]);

  if (loading) return <div className="text-center py-8 text-[13px] text-gray-400">Loading...</div>;

  const filtered = search
    ? docs.filter(d => {
        const dd = d.details as any;
        return dd.title?.toLowerCase().includes(search.toLowerCase()) || dd.body?.toLowerCase().includes(search.toLowerCase());
      })
    : docs;

  return (
    <div>
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search HR documents..." className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-[13px] bg-white outline-none" />
      </div>
      {filtered.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <Briefcase size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[14px] text-gray-500 font-medium">{search ? 'No matches' : 'No HR documents yet'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(d => {
            const dd = d.details as any;
            return (
              <details key={d.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm group">
                <summary className="p-4 cursor-pointer list-none flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold">{dd.category}</span>
                    </div>
                    <p className="text-[14px] font-bold text-gray-900">{dd.title}</p>
                  </div>
                  <ChevronDown size={14} className="text-gray-400 group-open:rotate-180 transition-transform shrink-0" />
                </summary>
                <div className="px-4 pb-4 border-t border-gray-100">
                  <p className="text-[13px] text-gray-700 whitespace-pre-wrap leading-relaxed">{dd.body}</p>
                  {dd.url && (
                    <a href={dd.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] font-bold text-teal-600 mt-3 hover:underline">
                      <ExternalLink size={12} /> Open document
                    </a>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Training Admin ──
function TrainingAdminView({ hotelId, onRefresh }: { hotelId: string; onRefresh: () => void }) {
  const [courses, setCourses] = useState<OpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddModule, setShowAddModule] = useState<string | null>(null);
  const [showAddQuiz, setShowAddQuiz] = useState<string | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [modules, setModules] = useState<OpRecord[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<OpRecord[]>([]);

  const [courseForm, setCourseForm] = useState({ title: '', description: '', category: 'Brand Standards' as string, required_for: '' as string, estimated_hours: 1, published: true });
  const [moduleForm, setModuleForm] = useState({ course_id: '', title: '', body: '', order: 1, estimated_minutes: 5, media_url: '' });
  const [quizForm, setQuizForm] = useState({ module_id: '', question: '', options: ['', '', '', ''], correct_index: 0, order: 1 });
  const [saving, setSaving] = useState(false);

  const CATS = ['Brand Standards', 'Attenda Platform', 'Safety', 'Hospitality', 'SOP', 'Leadership'];

  const loadAdmin = useCallback(async () => {
    setLoading(true);
    const c = await listCourses(hotelId);
    setCourses(c || []);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { loadAdmin(); }, [loadAdmin]);

  const loadModulesForCourse = async (courseId: string) => {
    const [m, q] = await Promise.all([
      listModules(hotelId, courseId),
      listQuizQuestions(hotelId, ''),
    ]);
    setModules(m || []);
    setQuizQuestions(q || []);
  };

  const expandCourse = async (courseId: string) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
      return;
    }
    setExpandedCourse(courseId);
    await loadModulesForCourse(courseId);
  };

  const handleAddCourse = async () => {
    if (!courseForm.title) return;
    setSaving(true);
    await createCourse(hotelId, {
      title: courseForm.title,
      description: courseForm.description,
      category: courseForm.category as any,
      required_for: courseForm.required_for ? courseForm.required_for.split(',').map(s => s.trim()) : [],
      estimated_hours: courseForm.estimated_hours,
      published: courseForm.published,
    });
    setCourseForm({ title: '', description: '', category: 'Brand Standards', required_for: '', estimated_hours: 1, published: true });
    setShowAddCourse(false);
    setSaving(false);
    await loadAdmin();
    onRefresh();
  };

  const handleAddModule = async () => {
    if (!moduleForm.title || !moduleForm.course_id) return;
    setSaving(true);
    await createModule(hotelId, moduleForm);
    setModuleForm({ course_id: moduleForm.course_id, title: '', body: '', order: modules.length + 1, estimated_minutes: 5, media_url: '' });
    setShowAddModule(null);
    setSaving(false);
    await loadModulesForCourse(moduleForm.course_id);
    onRefresh();
  };

  const handleAddQuiz = async () => {
    if (!quizForm.question || !quizForm.module_id) return;
    setSaving(true);
    await createQuizQuestion(hotelId, {
      module_id: quizForm.module_id,
      question: quizForm.question,
      options: quizForm.options.filter(o => o.trim()),
      correct_index: quizForm.correct_index,
      order: quizForm.order,
    });
    setQuizForm({ module_id: quizForm.module_id, question: '', options: ['', '', '', ''], correct_index: 0, order: (quizQuestions.filter(q => (q.details as any).module_id === quizForm.module_id).length) + 1 });
    setShowAddQuiz(null);
    setSaving(false);
    await loadModulesForCourse(expandedCourse || '');
    onRefresh();
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Delete this course and all modules/quizzes?')) return;
    await deleteCourse(id);
    await loadAdmin();
    onRefresh();
  };

  if (loading) return <div className="text-center py-8 text-[13px] text-gray-400">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-gray-600">{courses.length} courses total</p>
        <button onClick={() => setShowAddCourse(true)}
          className="px-4 py-2 rounded-xl text-white font-bold text-[12px] flex items-center gap-1" style={{ backgroundColor: '#0D9488' }}>
          <Plus size={14} /> New Course
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <p className="text-[14px] text-gray-500 font-medium">No courses yet</p>
          <p className="text-[12px] text-gray-400 mt-1">Create your first training course above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map(c => {
            const cd = c.details as any;
            const courseMods = modules.filter(m => (m.details as any).course_id === c.id);
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between cursor-pointer" onClick={() => expandCourse(c.id)}>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: '#7C3AED20', color: '#7C3AED' }}>{cd.category}</span>
                    <p className="text-[14px] font-bold text-gray-900">{cd.title}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.status === 'active' ? 'Published' : 'Draft'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400">{cd.estimated_hours}h · {courseMods.length} modules</span>
                    <button onClick={e => { e.stopPropagation(); handleDeleteCourse(c.id); }} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                    {expandedCourse === c.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {expandedCourse === c.id && (
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 space-y-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setShowAddModule(c.id); setModuleForm(p => ({ ...p, course_id: c.id, order: courseMods.length + 1 })); }}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-100">+ Module</button>
                    </div>

                    {courseMods.length === 0 ? (
                      <p className="text-[12px] text-gray-400 py-2">No modules yet.</p>
                    ) : courseMods.map(m => {
                      const md = m.details as any;
                      const modQs = quizQuestions.filter(q => (q.details as any).module_id === m.id);
                      return (
                        <div key={m.id} className="bg-white rounded-xl border border-gray-100 p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[13px] font-bold text-gray-900">{md.order}. {md.title}</p>
                              <p className="text-[11px] text-gray-400">{md.estimated_minutes} min · {modQs.length} quiz questions</p>
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => { setShowAddQuiz(m.id); setQuizForm({ ...quizForm, module_id: m.id, order: modQs.length + 1 }); }}
                                className="px-2 py-1 rounded text-[10px] font-bold bg-teal-50 text-teal-600">+ Quiz</button>
                              <button onClick={() => deleteModule(m.id).then(() => loadModulesForCourse(c.id))}
                                className="text-red-400"><Trash2 size={11} /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add Module form */}
                    {showAddModule === c.id && (
                      <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-2">
                        <input value={moduleForm.title} onChange={e => setModuleForm(p => ({ ...p, title: e.target.value }))} placeholder="Module title" className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[13px] border outline-none" />
                        <textarea value={moduleForm.body} onChange={e => setModuleForm(p => ({ ...p, body: e.target.value }))} rows={4} placeholder="Module content / training material..." className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[13px] border outline-none" />
                        <div className="flex gap-2">
                          <div>
                            <label className="text-[9px] text-gray-400 block">Minutes</label>
                            <input type="number" min={1} value={moduleForm.estimated_minutes} onChange={e => setModuleForm(p => ({ ...p, estimated_minutes: parseInt(e.target.value) || 5 }))} className="bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none w-20" />
                          </div>
                          <div className="flex-1">
                            <label className="text-[9px] text-gray-400 block">Video/URL (optional)</label>
                            <input value={moduleForm.media_url} onChange={e => setModuleForm(p => ({ ...p, media_url: e.target.value }))} placeholder="https://..." className="w-full bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleAddModule} disabled={saving || !moduleForm.title}
                            className="px-4 py-1.5 rounded-lg text-white font-bold text-[12px]" style={{ backgroundColor: '#0D9488' }}>Save</button>
                          <button onClick={() => setShowAddModule(null)} className="px-4 py-1.5 rounded-lg text-[12px] text-gray-500">Cancel</button>
                        </div>
                      </div>
                    )}

                    {/* Add Quiz form */}
                    {showAddQuiz && quizForm.module_id && courseMods.some(mm => mm.id === quizForm.module_id) && (
                      <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-2">
                        <input value={quizForm.question} onChange={e => setQuizForm(p => ({ ...p, question: e.target.value }))} placeholder="Quiz question" className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[13px] border outline-none" />
                        {quizForm.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <input type="radio" name="correct" checked={quizForm.correct_index === oi} onChange={() => setQuizForm(p => ({ ...p, correct_index: oi }))} className="accent-teal-600" />
                            <input value={opt} onChange={e => { const opts = [...quizForm.options]; opts[oi] = e.target.value; setQuizForm(p => ({ ...p, options: opts })); }}
                              placeholder={`Option ${oi + 1}`} className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-[13px] border outline-none" />
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <button onClick={handleAddQuiz} disabled={saving || !quizForm.question}
                            className="px-4 py-1.5 rounded-lg text-white font-bold text-[12px]" style={{ backgroundColor: '#0D9488' }}>Save Question</button>
                          <button onClick={() => setShowAddQuiz(null)} className="px-4 py-1.5 rounded-lg text-[12px] text-gray-500">Done</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Course modal */}
      {showAddCourse && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setShowAddCourse(false)}>
          <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-[15px] font-bold mb-4">New Course</h2>
            <div className="space-y-3">
              <input value={courseForm.title} onChange={e => setCourseForm(p => ({ ...p, title: e.target.value }))} placeholder="Course title (e.g. Attenda Platform Training)" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" />
              <textarea value={courseForm.description} onChange={e => setCourseForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Brief description..." className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Category</label>
                  <select value={courseForm.category} onChange={e => setCourseForm(p => ({ ...p, category: e.target.value }))} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border outline-none">
                    {CATS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Est. hours</label>
                  <input type="number" min={0.5} step={0.5} value={courseForm.estimated_hours} onChange={e => setCourseForm(p => ({ ...p, estimated_hours: parseFloat(e.target.value) || 1 }))} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Required for (comma-separated roles)</label>
                <input value={courseForm.required_for} onChange={e => setCourseForm(p => ({ ...p, required_for: e.target.value }))} placeholder="e.g. front_desk, housekeeping" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border outline-none" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={courseForm.published} onChange={e => setCourseForm(p => ({ ...p, published: e.target.checked }))} className="accent-teal-600" />
                <span className="text-[13px] font-semibold text-gray-700">Publish immediately</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button onClick={handleAddCourse} disabled={saving || !courseForm.title}
                  className="flex-1 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: '#0D9488' }}>
                  {saving ? 'Saving...' : 'Create Course'}
                </button>
                <button onClick={() => setShowAddCourse(false)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-[13px]">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Learning & HR (combined) ───────────────────────────
export default function LearningHRView({ hotelId }: { hotelId: string }) {
  const [learnTab, setLearnTab] = useState<'courses' | 'hr' | 'admin'>('courses');
  const [courses, setCourses] = useState<OpRecord[]>([]);
  const [staffName, setStaffName] = useState('');
  const [loading, setLoading] = useState(true);

  // Active course state
  const [activeCourse, setActiveCourse] = useState<string | null>(null);
  const [modules, setModules] = useState<OpRecord[]>([]);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<OpRecord[]>([]);
  const [completions, setCompletions] = useState<OpRecord[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<OpRecord[]>([]);

  // Admin state
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showAddCourse, setShowAddCourse] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showAddModule, setShowAddModule] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showAddQuiz, setShowAddQuiz] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [c, comps, qa] = await Promise.all([
      listCourses(hotelId),
      listModuleCompletions(hotelId),
      listQuizAttempts(hotelId),
    ]);
    setCourses(c || []);
    setCompletions(comps || []);
    setQuizAttempts(qa || []);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const stored = localStorage.getItem('attenda_staff_name') || '';
    setStaffName(stored);
  }, []);

  const loadCourseModules = async (courseId: string) => {
    const [m, q] = await Promise.all([
      listModules(hotelId, courseId),
      listQuizQuestions(hotelId, ''), // load all, filter per module in render
    ]);
    setModules(m || []);
    setQuizQuestions(q || []);
  };

  const openCourse = async (courseId: string) => {
    setActiveCourse(courseId);
    setActiveModule(null);
    await loadCourseModules(courseId);
  };

  const closeCourse = () => {
    setActiveCourse(null);
    setActiveModule(null);
    setModules([]);
    setQuizQuestions([]);
  };

  const getModuleCompletions = (modId: string): ModuleCompletion[] =>
    completions.filter(c => (c.details as any).module_id === modId).map(c => c.details as any);

  const getQuizAttempt = (modId: string): QuizAttempt | null => {
    const attempts = quizAttempts.filter(a => (a.details as any).module_id === modId);
    if (attempts.length === 0) return null;
    return attempts[attempts.length - 1].details as any;
  };

  const getCourseProgress = (courseId: string): { completed: number; total: number } => {
    const courseMods = modules.filter(m => (m.details as any).course_id === courseId);
    const total = courseMods.length;
    const completed = courseMods.filter(m => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const modDetails = m.details as any;
      return completions.some(c => (c.details as any).module_id === m.id);
    }).length;
    return { completed, total };
  };

  const COURSE_CATS = [
    { key: 'Brand Standards', label: 'Brand Standards', icon: '🏆' },
    { key: 'Attenda Platform', label: 'Attenda Platform', icon: '📱' },
    { key: 'Hospitality', label: 'Hospitality', icon: '🌟' },
    { key: 'Safety', label: 'Safety', icon: '🛡️' },
    { key: 'SOP', label: 'SOP', icon: '📋' },
    { key: 'Leadership', label: 'Leadership', icon: '🎯' },
  ];

  // Quiz taking state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<{ score: number; total: number; passed: boolean } | null>(null);

  const submitQuiz = async (modId: string) => {
    const qs = quizQuestions.filter(q => (q.details as any).module_id === modId);
    let correct = 0;
    qs.forEach(q => {
      const d = q.details as any;
      if (quizAnswers[q.id] === d.correct_index) correct++;
    });
    const total = qs.length;
    const passed = correct >= Math.ceil(total * 0.7); // 70% pass rate
    setQuizScore({ score: correct, total, passed });
    setQuizSubmitted(true);

    // Record attempt
    await recordQuizAttempt(hotelId, {
      staff_name: staffName || 'Staff',
      module_id: modId,
      course_id: activeCourse || '',
      score: correct,
      total,
      passed,
      attempted_at: new Date().toISOString(),
      answers: qs.map(q => quizAnswers[q.id] ?? -1),
    });

    // If passed, record completion
    if (passed) {
      await recordModuleCompletion(hotelId, {
        staff_name: staffName || 'Staff',
        module_id: modId,
        course_id: activeCourse || '',
        completed_at: new Date().toISOString(),
      });
      const comps = await listModuleCompletions(hotelId);
      setCompletions(comps || []);
    }

    const qa = await listQuizAttempts(hotelId);
    setQuizAttempts(qa || []);
  };

  const categoryIcon = (cat: string) => COURSE_CATS.find(c => c.key === cat)?.icon || '📚';
  const courseColor = (cat: string) => {
    const map: Record<string, string> = {
      'Brand Standards': '#7C3AED', 'Attenda Platform': '#0D9488',
      Hospitality: '#E11D48', Safety: '#D97706', SOP: '#2563EB', Leadership: '#059669',
    };
    return map[cat] || '#6B7280';
  };

  // ── Course Detail View ──
  if (activeCourse) {
    const course = courses.find(c => c.id === activeCourse);
    if (!course) { closeCourse(); return null; }
    const cd = course.details as any;
    const courseMods = modules.filter(m => (m.details as any).course_id === activeCourse);
    const progress = getCourseProgress(activeCourse);

    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <button onClick={closeCourse} className="flex items-center gap-1 text-[12px] text-teal-600 font-bold mb-4">&larr; All Courses</button>

        {/* Course header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mb-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{categoryIcon(cd.category)}</span>
            <div>
              <h2 className="text-[20px] font-extrabold text-gray-900">{cd.title}</h2>
              <p className="text-[12px] text-gray-500">{cd.category} · {cd.estimated_hours}h estimated</p>
            </div>
          </div>
          <p className="text-[13px] text-gray-700 mt-2">{cd.description}</p>
          {progress.total > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-[12px] mb-1">
                <span className="font-semibold text-gray-700">Progress</span>
                <span className="text-gray-500">{progress.completed}/{progress.total} modules</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all bg-teal-500" style={{ width: `${(progress.completed / progress.total) * 100}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Modules */}
        <div className="space-y-3">
          {courseMods.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl p-6 text-center">
              <p className="text-[13px] text-gray-500">No modules in this course yet.</p>
            </div>
          ) : courseMods.map((mod, idx) => {
            const md = mod.details as any;
            const completed = getModuleCompletions(mod.id);
            const isCompleted = completed.length > 0;
            const attempt = getQuizAttempt(mod.id);
            const hasQuiz = quizQuestions.filter(q => (q.details as any).module_id === mod.id).length > 0;

            return (
              <div key={mod.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isCompleted ? 'border-emerald-200' : 'border-gray-200'}`}>
                <div className="px-5 py-4 flex items-center justify-between cursor-pointer" onClick={() => setActiveModule(activeModule === mod.id ? null : mod.id)}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {isCompleted ? '✓' : idx + 1}
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-gray-900">{md.title}</p>
                      <p className="text-[11px] text-gray-400">{md.estimated_minutes} min · {hasQuiz ? 'Includes quiz' : 'Read only'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {attempt && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${attempt.passed ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                        {attempt.score}/{attempt.total}
                      </span>
                    )}
                    {isCompleted && <span className="text-emerald-600 text-[12px] font-bold">✓ Complete</span>}
                    {activeModule === mod.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {activeModule === mod.id && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                    {/* Module content */}
                    <div className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{md.body}</div>
                    {md.media_url && (
                      <a href={md.media_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] font-bold text-teal-600 hover:underline">
                        <ExternalLink size={12} /> Open video/resource
                      </a>
                    )}

                    {/* Quiz */}
                    {hasQuiz && !quizSubmitted && (
                      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                        <h4 className="font-bold text-[13px] text-gray-900">📝 Quiz</h4>
                        {quizQuestions.filter(q => (q.details as any).module_id === mod.id).sort((a, b) => ((a.details as any).order || 0) - ((b.details as any).order || 0)).map(q => {
                          const qd = q.details as any;
                          return (
                            <div key={q.id}>
                              <p className="text-[13px] font-semibold text-gray-800 mb-2">{qd.question}</p>
                              <div className="space-y-1.5">
                                {qd.options.map((opt: string, oi: number) => (
                                  <label key={oi} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border text-[12px] ${
                                    quizAnswers[q.id] === oi ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                  }`}>
                                    <input type="radio" name={`q-${q.id}`} checked={quizAnswers[q.id] === oi}
                                      onChange={() => setQuizAnswers(p => ({ ...p, [q.id]: oi }))} className="accent-teal-600" />
                                    {opt}
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        <button onClick={() => submitQuiz(mod.id)}
                          disabled={quizQuestions.filter(q => (q.details as any).module_id === mod.id).some(q => quizAnswers[q.id] === undefined)}
                          className="px-5 py-2.5 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: '#0D9488' }}>
                          Submit Quiz
                        </button>
                      </div>
                    )}

                    {quizSubmitted && quizScore && (
                      <div className={`rounded-xl p-4 ${quizScore.passed ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                        <p className={`font-bold text-[15px] ${quizScore.passed ? 'text-emerald-700' : 'text-red-700'}`}>
                          {quizScore.passed ? '🎉 Passed!' : '❌ Did not pass'}
                        </p>
                        <p className="text-[13px] text-gray-700 mt-1">{quizScore.score}/{quizScore.total} correct ({Math.round((quizScore.score / quizScore.total) * 100)}%)</p>
                        {!quizScore.passed && (
                          <button onClick={() => { setQuizSubmitted(false); setQuizScore(null); setQuizAnswers({}); }}
                            className="mt-2 text-[12px] font-bold text-teal-600 hover:underline">Retry Quiz</button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Main view: course catalog / HR / Admin ──
  if (loading) return <div className="p-4 text-center text-[13px] text-gray-400 py-12">Loading...</div>;

  const publishedCourses = courses.filter(c => c.status === 'active' || c.status === 'draft');

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-[20px] font-extrabold text-gray-900">Training</h1>
          <p className="text-[12px] text-gray-500">Courses · brand standards · certifications</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {[
          { key: 'courses' as const, label: `📚 Courses (${publishedCourses.length})` },
          { key: 'hr' as const, label: '📄 HR Documents' },
          { key: 'admin' as const, label: '⚙️ Manage' },
        ].map(t => (
          <button key={t.key} onClick={() => setLearnTab(t.key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap ${learnTab === t.key ? 'text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
            style={learnTab === t.key ? { backgroundColor: '#0D9488' } : {}}>{t.label}</button>
        ))}
      </div>

      {learnTab === 'courses' && (
        <>
          {publishedCourses.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl p-8 text-center">
              <GraduationCap size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-[14px] text-gray-500 font-medium">No courses yet</p>
              <p className="text-[12px] text-gray-400 mt-1">Admin can create training courses for brand standards, Attenda, safety, and more.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {COURSE_CATS.map(cat => {
                const catCourses = publishedCourses.filter(c => (c.details as any).category === cat.key);
                if (catCourses.length === 0) return null;
                return (
                  <div key={cat.key}>
                    <h2 className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">{cat.icon} {cat.label}</h2>
                    <div className="space-y-2">
                      {catCourses.map(c => {
                        const cd = c.details as any;
                        const progress = getCourseProgress(c.id);
                        return (
                          <div key={c.id} onClick={() => openCourse(c.id)}
                            className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: courseColor(cd.category)+'20', color: courseColor(cd.category) }}>
                                    {cd.category}
                                  </span>
                                  {cd.required_for?.length > 0 && (
                                    <span className="text-[10px] font-bold text-amber-700">Required</span>
                                  )}
                                </div>
                                <p className="text-[15px] font-extrabold text-gray-900">{cd.title}</p>
                                <p className="text-[12px] text-gray-500 mt-1 line-clamp-2">{cd.description}</p>
                                <p className="text-[11px] text-gray-400 mt-1">{cd.estimated_hours}h · {c.status === 'draft' ? 'Draft' : 'Published'}</p>
                              </div>
                              {progress.total > 0 && (
                                <div className="text-right shrink-0 ml-3">
                                  <p className="text-[18px] font-extrabold" style={{ color: progress.completed === progress.total ? '#059669' : '#0D9488' }}>
                                    {Math.round((progress.completed / progress.total) * 100)}%
                                  </p>
                                  <p className="text-[10px] text-gray-400">{progress.completed}/{progress.total}</p>
                                </div>
                              )}
                            </div>
                            {progress.total > 0 && (
                              <div className="h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${(progress.completed / progress.total) * 100}%`, backgroundColor: progress.completed === progress.total ? '#059669' : '#0D9488' }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {learnTab === 'hr' && <HRDocumentsView hotelId={hotelId} />}
      {learnTab === 'admin' && <TrainingAdminView hotelId={hotelId} onRefresh={loadAll} />}
    </div>
  );
}