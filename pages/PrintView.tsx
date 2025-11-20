import React, { useState, useEffect } from 'react';
import { Survey, QuestionType } from '../types';
import { getSurveys, getSurveyById } from '../services/db';

interface PrintViewProps {
  surveyId?: string;
  onBack?: () => void;
}

export const PrintView: React.FC<PrintViewProps> = ({ surveyId, onBack }) => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>(surveyId || '');
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);

  useEffect(() => {
    const loadSurveys = async () => {
      const loadedSurveys = await getSurveys();
      setSurveys(loadedSurveys);
      
      if (surveyId) {
        const survey = await getSurveyById(surveyId);
        if (survey) {
          setSelectedSurvey(survey);
          setSelectedSurveyId(surveyId);
        }
      }
    };
    loadSurveys();
  }, [surveyId]);

  const handleSurveySelect = async (id: string) => {
    setSelectedSurveyId(id);
    const survey = await getSurveyById(id);
    if (survey) {
      setSelectedSurvey(survey);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!selectedSurvey) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
            <div className="flex items-center gap-4 mb-6">
              <img src="/logo.png" alt="로고" className="h-12 w-12 object-contain" />
              <h1 className="text-3xl font-bold text-slate-900">보듬(BO DUME)</h1>
            </div>
            <h2 className="text-2xl font-semibold text-slate-700 mb-4">프린트할 설문지를 선택하세요</h2>
            <div className="space-y-3">
              {surveys.map(survey => (
                <button
                  key={survey.id}
                  onClick={() => handleSurveySelect(survey.id)}
                  className="w-full text-left p-4 border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="font-semibold text-slate-800">{survey.title}</div>
                  <div className="text-sm text-slate-500 mt-1">{survey.description}</div>
                  <div className="text-xs text-slate-400 mt-2">문항 수: {survey.questions.length}</div>
                </button>
              ))}
            </div>
            {onBack && (
              <button
                onClick={onBack}
                className="mt-6 px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
              >
                돌아가기
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
            font-size: 12px;
          }
          .no-print {
            display: none !important;
          }
          .print-page {
            page-break-after: always;
            page-break-inside: avoid;
          }
          .print-page:last-child {
            page-break-after: auto;
          }
          .question-block {
            page-break-inside: avoid;
            margin-bottom: 1.2rem;
          }
          input[type="radio"] {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            border: 2px solid #475569;
            border-radius: 50%;
            position: relative;
          }
          input[type="radio"]:checked::before {
            content: "";
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #475569;
          }
        }
        @page {
          margin: 1.5cm;
        }
      `}</style>
      
      <div className="min-h-screen bg-white p-8 print:p-0">
        {/* Control Buttons - Hidden on Print */}
        <div className="no-print max-w-4xl mx-auto mb-6 flex gap-4">
          <button
            onClick={handlePrint}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            프린트하기
          </button>
          <button
            onClick={() => {
              setSelectedSurvey(null);
              setSelectedSurveyId('');
            }}
            className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-semibold"
          >
            다른 설문지 선택
          </button>
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-semibold"
            >
              돌아가기
            </button>
          )}
        </div>

        {/* Print Content */}
        <div className="max-w-4xl mx-auto bg-white print:max-w-full">
          {/* Header */}
          <div className="mb-8 pb-6 border-b-2 border-slate-300 print:mb-3 print:pb-2">
            <div className="flex items-center gap-4 mb-4 print:gap-2 print:mb-2">
              <img src="/logo.png" alt="로고" className="h-16 w-16 object-contain print:h-8 print:w-8" />
              <div>
                <h1 className="text-4xl font-bold text-slate-900 print:text-xl print:leading-tight">보듬(BO DUME)</h1>
                <h2 className="text-2xl font-semibold text-slate-700 mt-2 print:text-base print:mt-1 print:leading-tight">{selectedSurvey.title}</h2>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-8 print:space-y-5">
            {selectedSurvey.questions.map((question, index) => (
              <div key={question.id} className="question-block">
                <div className="mb-4 print:mb-2">
                  <h3 className="text-xl font-bold text-slate-900 print:text-sm print:leading-tight">
                    Q{index + 1}. {question.text}
                    {question.isRequired && <span className="text-red-500 ml-2 print:text-xs">*</span>}
                  </h3>
                </div>

                {/* Single Choice Options */}
                {question.type === QuestionType.SINGLE_CHOICE && question.options && (
                  <div className="ml-6 space-y-3 print:ml-4 print:space-y-1.5">
                    {question.options.map((option, optIndex) => (
                      <label
                        key={option.id}
                        className="flex items-center gap-3 cursor-pointer group print:gap-2"
                      >
                        <input
                          type="radio"
                          name={`question_${question.id}`}
                          value={option.id}
                          className="w-5 h-5 text-blue-600 border-slate-300 focus:ring-blue-500 print:border-slate-800 print:w-3.5 print:h-3.5"
                        />
                        <span className="text-lg text-slate-700 print:text-xs print:leading-tight">
                          {optIndex + 1}. {option.text}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Rating Options */}
                {question.type === QuestionType.RATING && (
                  <div className="ml-6 print:ml-4">
                    <div className="flex items-center gap-4 print:gap-2">
                      {[1, 2, 3, 4, 5].map(num => (
                        <label key={num} className="flex items-center gap-2 cursor-pointer print:gap-1">
                          <input
                            type="radio"
                            name={`question_${question.id}`}
                            value={num}
                            className="w-5 h-5 text-blue-600 border-slate-300 focus:ring-blue-500 print:border-slate-800 print:w-3.5 print:h-3.5"
                          />
                          <span className="text-lg font-semibold text-slate-700 print:text-xs">{num}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex justify-between mt-2 text-sm text-slate-500 print:text-xs print:mt-1">
                      <span>매우 불만족</span>
                      <span>매우 만족</span>
                    </div>
                  </div>
                )}

                {/* Text Input */}
                {question.type === QuestionType.TEXT && (
                  <div className="ml-6 print:ml-4">
                    <div className="border-2 border-slate-400 rounded-lg p-4 min-h-[150px] print:border-slate-800 print:bg-white print:min-h-[80px] print:p-2">
                      <div className="text-slate-500 text-sm print:text-xs mb-3 print:mb-1.5 font-medium">답변을 작성해주세요</div>
                      <div className="space-y-3 print:space-y-1.5">
                        <div className="h-7 border-b-2 border-slate-300 print:border-slate-600 print:h-4"></div>
                        <div className="h-7 border-b-2 border-slate-300 print:border-slate-600 print:h-4"></div>
                        <div className="h-7 border-b-2 border-slate-300 print:border-slate-600 print:h-4"></div>
                        <div className="h-7 border-b-2 border-slate-300 print:border-slate-600 print:h-4"></div>
                        <div className="h-7 border-b-2 border-slate-300 print:border-slate-600 print:h-4"></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Email Input */}
                {question.type === QuestionType.EMAIL && (
                  <div className="ml-6 print:ml-4">
                    <div className="flex items-end gap-3 print:gap-2">
                      <div className="border-2 border-slate-400 rounded-lg px-4 py-3 flex-1 print:border-slate-800 print:bg-white print:px-2 print:py-1.5">
                        <div className="text-slate-500 text-sm print:text-xs mb-2 print:mb-1 font-medium">이메일 아이디</div>
                        <div className="h-10 border-b-2 border-slate-500 print:border-slate-700 print:h-6"></div>
                      </div>
                      <span className="text-3xl font-bold text-slate-700 print:text-lg mb-1">@</span>
                      <div className="border-2 border-slate-400 rounded-lg px-4 py-3 flex-1 print:border-slate-800 print:bg-white print:px-2 print:py-1.5">
                        <div className="text-slate-500 text-sm print:text-xs mb-2 print:mb-1 font-medium">도메인</div>
                        <div className="h-10 border-b-2 border-slate-500 print:border-slate-700 print:h-6"></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Phone Input */}
                {question.type === QuestionType.PHONE && (
                  <div className="ml-6 print:ml-4">
                    <div className="border-2 border-slate-400 rounded-lg px-4 py-3 print:border-slate-800 print:bg-white print:px-2 print:py-1.5">
                      <div className="text-slate-500 text-sm print:text-xs mb-2 print:mb-1 font-medium">연락처 (예: 010-1234-5678)</div>
                      <div className="flex items-center gap-2 print:gap-1">
                        <div className="h-10 border-b-2 border-slate-500 print:border-slate-700 flex-1 print:h-6"></div>
                        <span className="text-xl font-bold text-slate-700 print:text-sm">-</span>
                        <div className="h-10 border-b-2 border-slate-500 print:border-slate-700 flex-1 print:h-6"></div>
                        <span className="text-xl font-bold text-slate-700 print:text-sm">-</span>
                        <div className="h-10 border-b-2 border-slate-500 print:border-slate-700 flex-1 print:h-6"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

