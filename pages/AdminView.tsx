
import React, { useState, useEffect } from 'react';
import { Survey, Question, Option, QuestionType, TargetAudience } from '../types';
import { getSurveys, saveSurvey, deleteSurvey, checkAdminAuth, setAdminAuth, updateSurveyStatus } from '../services/db';
import { Analytics } from '../components/Analytics';
import { LayoutDashboard, Plus, Trash2, Edit, BarChart3, LogOut, Save, X, Lock, Printer } from 'lucide-react';

interface AdminViewProps {
  onLogout: () => void;
  onPrint?: (surveyId?: string) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onLogout, onPrint }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [savePassword, setSavePassword] = useState(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'editor' | 'analytics'>('dashboard');
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);

  useEffect(() => {
    if (checkAdminAuth()) {
      setIsAuthenticated(true);
    }
    // Initial load
    const loadSurveys = async () => {
      const surveys = await getSurveys();
      setSurveys(surveys);
    };
    loadSurveys();
  }, []);

  const handleLogin = () => {
    if (passwordInput === '221129') {
      setIsAuthenticated(true);
      if (savePassword) {
        setAdminAuth(true);
      }
    } else {
      alert('비밀번호가 올바르지 않습니다.');
    }
  };

  // --- Dashboard Handlers ---
  const handleCreateNew = async () => {
    const newSurvey: Survey = {
      id: `survey_${Date.now()}`,
      title: '새 설문조사',
      description: '설문에 대한 설명을 입력하세요',
      isActive: false,
      targetAudience: TargetAudience.ALL,
      createdAt: Date.now(),
      questions: []
    };
    await saveSurvey(newSurvey);
    await refreshSurveys();
    handleEdit(newSurvey);
  };

  const refreshSurveys = async () => {
    const surveys = await getSurveys();
    setSurveys(surveys);
  };

  const handleEdit = (s: Survey) => {
    setSelectedSurvey(s);
    setActiveTab('editor');
  };

  const handleAnalyze = (s: Survey, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedSurvey(s);
    setActiveTab('analytics');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('정말 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다.')) {
      await deleteSurvey(id);
      if (selectedSurvey?.id === id) {
        setSelectedSurvey(null);
        setActiveTab('dashboard');
      }
      await refreshSurveys();
    }
  };

  const toggleActive = async (s: Survey, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newState = !s.isActive;
    // Use the new service function to handle exclusive activation
    await updateSurveyStatus(s.id, newState, s.targetAudience);

    // Refresh UI
    await refreshSurveys();
    if (selectedSurvey && selectedSurvey.id === s.id) {
      // If we are editing the one we just toggled, update the local state
      setSelectedSurvey({ ...selectedSurvey, isActive: newState });
    }
  };

  // --- Editor Handlers ---
  const updateSelectedSurvey = async (updates: Partial<Survey>) => {
    if (!selectedSurvey) return;

    // Special handling if we are changing active state or audience in editor
    if (updates.isActive !== undefined || updates.targetAudience !== undefined) {
      const newActive = updates.isActive !== undefined ? updates.isActive : selectedSurvey.isActive;
      const newAudience = updates.targetAudience !== undefined ? updates.targetAudience : selectedSurvey.targetAudience;

      await updateSurveyStatus(selectedSurvey.id, newActive, newAudience);

      const updated = { ...selectedSurvey, ...updates, isActive: newActive, targetAudience: newAudience };
      setSelectedSurvey(updated);
      await refreshSurveys(); // Refresh list to show other deactivated surveys
    } else {
      // Standard update for title, description, questions
      const updated = { ...selectedSurvey, ...updates };
      setSelectedSurvey(updated);
      await saveSurvey(updated);
      // Also update in list to reflect changes immediately if needed
      setSurveys(prev => prev.map(s => s.id === updated.id ? updated : s));
    }
  };

  const addQuestion = () => {
    if (!selectedSurvey) return;
    const newQ: Question = {
      id: `q_${Date.now()}`,
      text: '새 질문',
      type: QuestionType.SINGLE_CHOICE,
      isRequired: true,
      options: [{ id: `opt_${Date.now()}`, text: '옵션 1' }]
    };
    updateSelectedSurvey({ questions: [...selectedSurvey.questions, newQ] });
  };

  const updateQuestion = (qId: string, updates: Partial<Question>) => {
    if (!selectedSurvey) return;
    const newQuestions = selectedSurvey.questions.map(q => q.id === qId ? { ...q, ...updates } : q);
    updateSelectedSurvey({ questions: newQuestions });
  };

  const deleteQuestion = (qId: string) => {
    if (!selectedSurvey) return;
    updateSelectedSurvey({ questions: selectedSurvey.questions.filter(q => q.id !== qId) });
  };

  // --- Password Screen ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">관리자 로그인</h1>
          <p className="text-slate-500 mb-6">대시보드 접근을 위해 비밀번호를 입력하세요.</p>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="비밀번호 입력"
            className="w-full p-4 border border-slate-300 rounded-xl mb-4 text-center text-xl outline-none focus:border-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <label className="flex items-center justify-center gap-2 mb-6 text-slate-600 cursor-pointer select-none">
            <input type="checkbox" checked={savePassword} onChange={(e) => setSavePassword(e.target.checked)} />
            비밀번호 저장
          </label>
          <button
            onClick={handleLogin}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition"
          >
            확인
          </button>
          <button onClick={onLogout} className="mt-4 text-sm text-slate-400 underline">돌아가기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col print:hidden shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <img src="/logo.png" alt="로고" className="h-10 w-10 object-contain" />
            <h1 className="text-xl font-bold tracking-wider">BO DUME SURVEY</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">관리자 콘솔</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button
            onClick={() => { setSelectedSurvey(null); setActiveTab('dashboard'); refreshSurveys(); }}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition ${activeTab === 'dashboard' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
          >
            <LayoutDashboard size={20} /> 대시보드
          </button>

          {selectedSurvey && (
            <>
              <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase mt-4">현재 설문</div>
              <button
                onClick={() => setActiveTab('editor')}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition ${activeTab === 'editor' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
              >
                <Edit size={20} /> 편집
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition ${activeTab === 'analytics' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
              >
                <BarChart3 size={20} /> 통계/분석
              </button>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={() => { setAdminAuth(false); onLogout(); }} className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-white transition">
            <LogOut size={20} /> 로그아웃
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 overflow-y-auto h-screen">
        {activeTab === 'dashboard' && (
          <div className="p-10">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-slate-800">설문 목록</h2>
              <button onClick={handleCreateNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-lg transition font-medium">
                <Plus size={20} /> 새 설문 만들기
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {surveys.map(survey => (
                <div
                  key={survey.id}
                  onClick={() => handleEdit(survey)}
                  className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition border border-slate-200 flex flex-col h-64 cursor-pointer group"
                >
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold text-slate-800 line-clamp-2 group-hover:text-blue-600 transition-colors">{survey.title}</h3>
                      <button
                        onClick={(e) => toggleActive(survey, e)}
                        className={`px-2 py-1 text-xs font-bold rounded-full transition-colors shrink-0 ml-2 ${survey.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        {survey.isActive ? '진행중' : '중지됨'}
                      </button>
                    </div>
                    <p className="text-slate-500 mt-2 line-clamp-2 text-sm">{survey.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded font-medium">
                        {survey.targetAudience === TargetAudience.EMPLOYEE ? '임직원용' : survey.targetAudience === TargetAudience.GENERAL ? '고객용' : '전체 대상'}
                      </span>
                      <span className="text-slate-400 text-xs flex items-center">문항: {survey.questions.length}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100">
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(survey); }} className="flex-1 py-2 text-sm bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg font-medium">편집</button>
                    <button onClick={(e) => handleAnalyze(survey, e)} className="flex-1 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium">결과보기</button>
                    {onPrint && (
                      <button onClick={(e) => { e.stopPropagation(); onPrint(survey.id); }} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="프린트 버전 보기">
                        <Printer size={18} />
                      </button>
                    )}
                    <button onClick={(e) => handleDelete(survey.id, e)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'editor' && selectedSurvey && (
          <div className="p-10">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 mb-8">
                <div className="flex justify-between items-start mb-4">
                  <label className="block text-xs font-bold text-slate-400 uppercase">설문 제목</label>
                  <div className="flex items-center gap-4">
                    <select
                      value={selectedSurvey.targetAudience}
                      onChange={(e) => updateSelectedSurvey({ targetAudience: e.target.value as TargetAudience })}
                      className="text-sm border border-slate-300 rounded-md px-3 py-1 outline-none focus:border-blue-500"
                    >
                      <option value={TargetAudience.ALL}>전체 대상</option>
                      <option value={TargetAudience.GENERAL}>일반 고객용</option>
                      <option value={TargetAudience.EMPLOYEE}>기업 임직원용</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedSurvey.isActive}
                        onChange={(e) => updateSelectedSurvey({ isActive: e.target.checked })}
                      />
                      설문 활성화
                    </label>
                  </div>
                </div>
                <input
                  value={selectedSurvey.title}
                  onChange={e => updateSelectedSurvey({ title: e.target.value })}
                  className="w-full text-3xl font-bold text-slate-800 border-b-2 border-transparent hover:border-slate-200 focus:border-blue-600 outline-none bg-transparent placeholder-slate-300"
                  placeholder="설문 제목을 입력하세요"
                />
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 mt-4">설명</label>
                <textarea
                  value={selectedSurvey.description}
                  onChange={e => updateSelectedSurvey({ description: e.target.value })}
                  className="w-full text-slate-600 bg-slate-50 p-3 rounded-lg mt-1 outline-none focus:ring-1 focus:ring-blue-500"
                  rows={2}
                  placeholder="설문 설명을 입력하세요"
                />
              </div>

              <div className="space-y-6">
                {selectedSurvey.questions.map((q, idx) => (
                  <div key={q.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative group">
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <button onClick={() => deleteQuestion(q.id)} className="text-red-400 hover:text-red-600"><Trash2 size={18} /></button>
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                      <span className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-full text-sm font-bold text-slate-500">
                        {idx + 1}
                      </span>
                      <select
                        value={q.type}
                        onChange={(e) => updateQuestion(q.id, { type: e.target.value as QuestionType })}
                        className="text-sm border border-slate-300 rounded px-2 py-1 bg-white"
                      >
                        <option value={QuestionType.SINGLE_CHOICE}>객관식 (선택)</option>
                        <option value={QuestionType.RATING}>만족도 (1-5점)</option>
                        <option value={QuestionType.TEXT}>주관식 (텍스트)</option>
                        <option value={QuestionType.EMAIL}>이메일 입력</option>
                        <option value={QuestionType.PHONE}>연락처 입력</option>
                      </select>
                      <label className="flex items-center gap-2 text-sm text-slate-500 ml-4 cursor-pointer">
                        <input type="checkbox" checked={q.isRequired} onChange={(e) => updateQuestion(q.id, { isRequired: e.target.checked })} />
                        필수 응답
                      </label>
                    </div>

                    <input
                      value={q.text}
                      onChange={e => updateQuestion(q.id, { text: e.target.value })}
                      className="w-full text-xl font-semibold text-slate-800 border-b border-slate-200 pb-2 outline-none focus:border-blue-500"
                      placeholder="질문을 입력하세요..."
                    />

                    {q.type === QuestionType.SINGLE_CHOICE && (
                      <div className="mt-6 space-y-3 pl-4 border-l-2 border-slate-100">
                        {q.options?.map((opt, oIdx) => (
                          <div key={opt.id} className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full border border-slate-300" />
                            <input
                              value={opt.text}
                              onChange={e => {
                                const newOpts = [...(q.options || [])];
                                newOpts[oIdx] = { ...opt, text: e.target.value };
                                updateQuestion(q.id, { options: newOpts });
                              }}
                              className="flex-1 p-2 bg-slate-50 rounded border border-transparent hover:border-slate-200 focus:border-blue-400 outline-none text-sm"
                              placeholder="옵션 내용"
                            />

                            {/* Logic Jump UI */}
                            <div className="text-xs flex items-center gap-2 text-slate-400 bg-slate-50 px-2 py-1 rounded">
                              이동:
                              <select
                                value={opt.nextQuestionId || ""}
                                onChange={e => {
                                  const newOpts = [...(q.options || [])];
                                  newOpts[oIdx] = { ...opt, nextQuestionId: e.target.value || null };
                                  updateQuestion(q.id, { options: newOpts });
                                }}
                                className="bg-transparent outline-none border-none font-medium text-slate-600 max-w-[100px] truncate"
                              >
                                <option value="">다음 질문</option>
                                {selectedSurvey.questions.map(tq => tq.id !== q.id && (
                                  <option key={tq.id} value={tq.id}>Q{selectedSurvey.questions.indexOf(tq) + 1}: {tq.text.substring(0, 10)}...</option>
                                ))}
                              </select>
                            </div>

                            {/* Add Sub-Question Button */}
                            <button
                              onClick={() => {
                                const newSubQId = `q_${Date.now()}`;
                                const newSubQ: Question = {
                                  id: newSubQId,
                                  text: `${opt.text} - 하위 질문`,
                                  type: QuestionType.SINGLE_CHOICE,
                                  isRequired: true,
                                  options: [{ id: `opt_${Date.now()}_sub`, text: '옵션 1' }]
                                };

                                // 1. Insert new question after current question
                                const currentQIdx = selectedSurvey.questions.findIndex(sq => sq.id === q.id);
                                const newQuestions = [...selectedSurvey.questions];
                                newQuestions.splice(currentQIdx + 1, 0, newSubQ);

                                // 2. Link current option to new question
                                const newOpts = [...(q.options || [])];
                                newOpts[oIdx] = { ...opt, nextQuestionId: newSubQId };

                                // 3. Update survey (update question options AND insert new question)
                                // We need to do this carefully. updateQuestion only updates the current question.
                                // We need to update the whole survey.
                                const updatedQuestionsWithLink = newQuestions.map(sq =>
                                  sq.id === q.id ? { ...sq, options: newOpts } : sq
                                );

                                updateSelectedSurvey({ questions: updatedQuestionsWithLink });
                              }}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium transition-colors"
                              title="이 옵션을 선택했을 때 나올 하위 질문을 바로 아래에 추가합니다"
                            >
                              + 하위질문
                            </button>

                            <button onClick={() => {
                              const newOpts = q.options?.filter(o => o.id !== opt.id);
                              updateQuestion(q.id, { options: newOpts });
                            }} className="text-slate-300 hover:text-red-500"><X size={16} /></button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const newOpt: Option = { id: `opt_${Date.now()}`, text: '새 옵션' };
                            updateQuestion(q.id, { options: [...(q.options || []), newOpt] });
                          }}
                          className="text-sm text-blue-600 font-medium hover:underline pl-2"
                        >
                          + 옵션 추가
                        </button>
                      </div>
                    )}

                  </div>
                ))}

                <button onClick={addQuestion} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:border-blue-500 hover:text-blue-500 transition">
                  + 질문 추가하기
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && selectedSurvey && (
          <div className="p-10">
            <Analytics survey={selectedSurvey} />
          </div>
        )}
      </div>
    </div>
  );
};
