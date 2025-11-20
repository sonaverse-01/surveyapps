
import React, { useState, useMemo } from 'react';
import { Survey, Option, SurveyResponse, UserType, QuestionType, ResponseValue } from '../types';
import { saveResponse } from '../services/db';
import { ChevronRight, ArrowLeft, Mail, Phone } from 'lucide-react';

interface SurveyViewProps {
  survey: Survey;
  userType: UserType;
  onComplete: () => void;
  onBackToLanding: () => void;
}

// Email Domain Options
const DOMAINS = [
  "naver.com",
  "gmail.com",
  "daum.net",
  "kakao.com",
  "nate.com",
  "직접입력"
];

export const SurveyView: React.FC<SurveyViewProps> = ({ survey, userType, onComplete, onBackToLanding }) => {
  const [currentQuestionId, setCurrentQuestionId] = useState<string>(survey.questions[0].id);
  const [answers, setAnswers] = useState<ResponseValue[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  // Email State
  const [emailUser, setEmailUser] = useState('');
  const [emailDomain, setEmailDomain] = useState(DOMAINS[0]);
  const [customDomain, setCustomDomain] = useState('');

  // Phone State
  const [phoneNumber, setPhoneNumber] = useState('');

  const currentQuestion = useMemo(() =>
    survey.questions.find(q => q.id === currentQuestionId),
    [currentQuestionId, survey.questions]);

  // 전체 설문에서 "조건부로 이동하는 질문들(Conditional Questions)"의 ID를 수집
  const conditionalQuestionIds = useMemo(() => {
    const ids = new Set<string>();
    survey.questions.forEach(q => {
      q.options?.forEach(opt => {
        if (opt.nextQuestionId) {
          const trimmed = String(opt.nextQuestionId).trim();
          if (trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined') {
            ids.add(trimmed);
          }
        }
      });
    });
    return ids;
  }, [survey.questions]);

  const handleOptionSelect = (option: Option) => {
    const newAnswer: ResponseValue = {
      questionId: currentQuestion!.id,
      answer: option.id,
      questionText: currentQuestion!.text
    };
    // nextQuestionId 처리: null, undefined, 빈 문자열은 undefined로 변환
    let nextId: string | undefined = undefined;
    if (option.nextQuestionId) {
      const trimmed = String(option.nextQuestionId).trim();
      if (trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined') {
        nextId = trimmed;
      }
    }
    saveAndNext(newAnswer, nextId);
  };

  const handleTextSubmit = (value: string | number) => {
    const newAnswer: ResponseValue = {
      questionId: currentQuestion!.id,
      answer: value,
      questionText: currentQuestion!.text
    };
    saveAndNext(newAnswer);
  };

  const handleEmailSubmit = () => {
    if (!emailUser) {
      alert('이메일 아이디를 입력해주세요.');
      return;
    }
    const domain = emailDomain === '직접입력' ? customDomain : emailDomain;
    if (!domain) {
      alert('도메인을 입력해주세요.');
      return;
    }
    const fullEmail = `${emailUser}@${domain}`;
    handleTextSubmit(fullEmail);
    // Reset email state for next time (unlikely in single survey but good practice)
    setEmailUser('');
    setEmailDomain(DOMAINS[0]);
    setCustomDomain('');
  };

  // Phone number formatting: 000-0000-0000
  const formatPhoneNumber = (value: string): string => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, '');
    
    // 길이에 따라 포맷팅
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else if (numbers.length <= 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    } else {
      // 11자리 초과 시 자르기
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const handlePhoneSubmit = () => {
    if (!phoneNumber || phoneNumber.replace(/[^\d]/g, '').length < 10) {
      alert('올바른 연락처를 입력해주세요. (최소 10자리)');
      return;
    }
    handleTextSubmit(phoneNumber);
    setPhoneNumber('');
  };

  const saveAndNext = (answer: ResponseValue, nextId?: string | null) => {
    const updatedAnswers = [...answers.filter(a => a.questionId !== currentQuestion!.id), answer];
    setAnswers(updatedAnswers);
    goNext(nextId, updatedAnswers);
  };

  const goNext = (forcedNextId?: string | null | undefined, currentAnswers?: ResponseValue[]) => {
    setHistory(prev => [...prev, currentQuestionId]);

    // forcedNextId가 유효한 문자열인 경우에만 해당 질문으로 이동
    if (forcedNextId && typeof forcedNextId === 'string') {
      const trimmed = forcedNextId.trim();
      if (trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined') {
        // 해당 질문이 존재하는지 확인
        const targetQuestion = survey.questions.find(q => q.id === trimmed);
        if (targetQuestion) {
          setCurrentQuestionId(trimmed);
          return;
        }
      }
    }

    // 다음 질문으로 순차 이동 (Global Skip Logic 적용)
    const currentIndex = survey.questions.findIndex(q => q.id === currentQuestionId);

    if (currentIndex === -1) {
      const finalAnswers = currentAnswers || answers;
      submitSurvey(finalAnswers);
      return;
    }

    // 다음 질문 후보들을 순회하며 "조건부 질문"이 아닌 첫 번째 질문을 찾음
    let nextQuestionIndex = -1;
    for (let i = currentIndex + 1; i < survey.questions.length; i++) {
      const q = survey.questions[i];
      // 만약 질문이 누군가의 타겟(조건부 질문)이라면 건너뜀
      // 단, 여기서 건너뛴다는 것은 "자연스럽게 흘러들어가는 것"을 막는 것임.
      // forcedNextId로 이동하는 경우는 위에서 이미 처리됨.
      if (!conditionalQuestionIds.has(q.id)) {
        nextQuestionIndex = i;
        break;
      }
    }

    if (nextQuestionIndex !== -1) {
      // 다음 질문으로 이동
      setCurrentQuestionId(survey.questions[nextQuestionIndex].id);
    } else {
      // 더 이상 갈 곳이 없으면 설문 제출
      const finalAnswers = currentAnswers || answers;
      submitSurvey(finalAnswers);
    }
  };

  const goBack = () => {
    if (history.length === 0) {
      onBackToLanding();
      return;
    }
    const prevId = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setCurrentQuestionId(prevId);
  };

  const submitSurvey = (finalAnswers?: ResponseValue[]) => {
    const response: SurveyResponse = {
      id: crypto.randomUUID(),
      surveyId: survey.id,
      userType,
      answers: finalAnswers || answers,
      submittedAt: Date.now()
    };
    saveResponse(response);
    onComplete();
  };

  if (!currentQuestion) return <div>오류: 질문을 찾을 수 없습니다.</div>;

  const progress = Math.min(100, (history.length / survey.questions.length) * 100);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm px-8 py-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="로고" className="h-8 w-8 md:h-10 md:w-10 object-contain" />
          <button onClick={goBack} className="text-slate-500 hover:text-slate-800 flex items-center gap-2 text-lg font-medium">
            <ArrowLeft /> 이전으로
          </button>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-sm text-slate-400 font-semibold tracking-widest uppercase">
            {userType === UserType.EMPLOYEE ? '임직원 전용' : '고객 설문'}
          </span>
          <div className="w-48 h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-blue-600 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full">

        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h1 className="text-4xl font-bold text-slate-900 mb-12 leading-tight text-center">
            {currentQuestion.text}
          </h1>

          <div className="space-y-4 w-full">
            {/* Single Choice Options */}
            {currentQuestion.type === QuestionType.SINGLE_CHOICE && (
              <div className="grid grid-cols-1 gap-4">
                {currentQuestion.options?.map(option => (
                  <button
                    key={option.id}
                    onClick={() => handleOptionSelect(option)}
                    className="group flex items-center justify-between w-full p-8 text-left bg-white border-2 border-slate-200 hover:border-blue-600 hover:bg-blue-50 rounded-2xl transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <span className="text-2xl font-medium text-slate-700 group-hover:text-blue-700">
                      {option.text}
                    </span>
                    <div className="w-8 h-8 rounded-full border-2 border-slate-300 group-hover:border-blue-600 flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Rating Options */}
            {currentQuestion.type === QuestionType.RATING && (
              <div className="flex flex-col items-center gap-6">
                <div className="flex justify-between items-center gap-4 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm w-full max-w-3xl mx-auto">
                  {[1, 2, 3, 4, 5].map(num => (
                    <button
                      key={num}
                      onClick={() => handleTextSubmit(num)}
                      className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-slate-200 text-3xl font-bold text-slate-600 hover:border-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between w-full max-w-3xl px-4 text-slate-400 font-medium">
                  <span>매우 불만족</span>
                  <span>매우 만족</span>
                </div>
              </div>
            )}

            {/* Text Input */}
            {currentQuestion.type === QuestionType.TEXT && (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <textarea
                  className="w-full p-4 text-xl border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-h-[200px]"
                  placeholder="답변을 입력해주세요..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleTextSubmit(e.currentTarget.value);
                    }
                  }}
                />
                <button
                  onClick={(e) => handleTextSubmit((e.target as any).previousSibling.value)}
                  className="mt-6 w-full py-4 bg-blue-600 text-white text-xl font-bold rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  다음으로 <ChevronRight />
                </button>
              </div>
            )}

            {/* Email Input */}
            {currentQuestion.type === QuestionType.EMAIL && (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row items-center gap-4 text-xl">
                  <div className="relative flex-1 w-full">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                    <input
                      type="text"
                      value={emailUser}
                      onChange={(e) => setEmailUser(e.target.value)}
                      placeholder="이메일 아이디"
                      className="w-full pl-12 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <span className="font-bold text-slate-400">@</span>
                  <div className="flex-1 w-full">
                    <select
                      value={emailDomain}
                      onChange={(e) => {
                        setEmailDomain(e.target.value);
                        if (e.target.value !== '직접입력') setCustomDomain('');
                      }}
                      className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none"
                    >
                      {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                {emailDomain === '직접입력' && (
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="도메인 입력 (예: mycompany.com)"
                    className="w-full mt-4 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xl"
                  />
                )}

                <button
                  onClick={handleEmailSubmit}
                  className="mt-8 w-full py-4 bg-blue-600 text-white text-xl font-bold rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  확인 후 다음으로 <ChevronRight />
                </button>
              </div>
            )}

            {/* Phone Input */}
            {currentQuestion.type === QuestionType.PHONE && (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    placeholder="000-0000-0000"
                    maxLength={13}
                    className="w-full pl-12 p-4 text-xl border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handlePhoneSubmit();
                      }
                    }}
                  />
                </div>
                <p className="mt-4 text-sm text-slate-500 text-center">예시: 010-1234-5678</p>
                <button
                  onClick={handlePhoneSubmit}
                  className="mt-6 w-full py-4 bg-blue-600 text-white text-xl font-bold rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  확인 후 다음으로 <ChevronRight />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
