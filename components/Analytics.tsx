
import React, { useEffect, useState } from 'react';
import { Survey, SurveyResponse, QuestionType } from '../types';
import { getResponses } from '../services/db';
import { Printer, Download } from 'lucide-react';

interface AnalyticsProps {
  survey: Survey;
}

export const Analytics: React.FC<AnalyticsProps> = ({ survey }) => {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);

  useEffect(() => {
    const loadResponses = async () => {
      const responses = await getResponses(survey.id);
      setResponses(responses);
    };
    loadResponses();
  }, [survey.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    const headers = ['응답ID', '제출일시', ...survey.questions.map(q => `Q: ${q.text}`)];
    const rows = responses.map(r => {
      const date = new Date(r.submittedAt).toLocaleString('ko-KR');
      const answerCells = survey.questions.map(q => {
        const ans = r.answers.find(a => a.questionId === q.id);
        if (!ans) return '';
        // If choice, try to find option text, otherwise raw value
        if (q.options) {
           const opt = q.options.find(o => o.id === ans.answer);
           return opt ? opt.text : ans.answer;
        }
        return ans.answer;
      });
      return [r.id, date, ...answerCells];
    });

    // Add BOM (\uFEFF) for Excel to recognize UTF-8
    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${survey.title}_결과.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (responses.length === 0) {
    return <div className="p-8 text-center text-slate-500">아직 수집된 응답이 없습니다.</div>;
  }

  return (
    <div className="space-y-12 pb-20 w-full">
      <div className="flex justify-between items-center print:hidden">
        <h2 className="text-2xl font-bold text-slate-800">설문 결과 분석</h2>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition shadow-sm"
          >
            <Download size={18} />
            CSV 다운로드
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition shadow-sm"
          >
            <Printer size={18} />
            리포트 인쇄
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:grid-cols-3">
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:border-slate-300">
            <h3 className="text-sm font-medium text-slate-500">총 응답 수</h3>
            <p className="text-3xl font-bold text-slate-900 mt-2">{responses.length}명</p>
         </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:border-slate-300">
            <h3 className="text-sm font-medium text-slate-500">응답 완료율</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">100%</p>
         </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:border-slate-300">
            <h3 className="text-sm font-medium text-slate-500">총 문항 수</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{survey.questions.length}개</p>
         </div>
      </div>

      {survey.questions.map((q, index) => {
        const relevantResponses = responses.flatMap(r => r.answers.filter(a => a.questionId === q.id));
        if (relevantResponses.length === 0) return null;
        
        const totalForQ = relevantResponses.length;

        return (
          <div key={q.id} className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 print-break-inside print:border-slate-300 print:shadow-none print:mb-8">
            <div className="mb-6 border-b border-slate-100 pb-4 print:border-slate-300">
               <span className="text-sm font-bold text-slate-400 tracking-wider">Q{index + 1}.</span>
               <h3 className="text-xl font-bold text-slate-800 mt-1">{q.text}</h3>
            </div>

            {/* Gauge Bar Visualization for Choices */}
            {(q.type === QuestionType.SINGLE_CHOICE || q.type === QuestionType.RATING) && (
              <div className="space-y-6">
                {(() => {
                   const counts: Record<string, number> = {};
                   relevantResponses.forEach(resp => {
                     const val = String(resp.answer);
                     const label = q.options?.find(opt => opt.id === val)?.text || val;
                     counts[label] = (counts[label] || 0) + 1;
                   });
                   
                   // Sort by count desc
                   const sortedData = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                   // Include options with 0 votes if defined in options list
                   if (q.options) {
                      q.options.forEach(opt => {
                          if (!counts[opt.text]) sortedData.push([opt.text, 0]);
                      });
                   }

                   return sortedData.map(([label, count]) => {
                     const percentage = totalForQ > 0 ? Math.round((count / totalForQ) * 100) : 0;
                     return (
                       <div key={label} className="w-full">
                          <div className="flex justify-between mb-2">
                             <span className="font-medium text-slate-700">{label}</span>
                             <span className="text-sm text-slate-500 font-semibold">{count}표 ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden print:border print:border-slate-200">
                             <div 
                                className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out print:bg-blue-600 print:print-color-adjust-exact"
                                style={{ width: `${percentage}%` }}
                             />
                          </div>
                       </div>
                     );
                   });
                })()}
              </div>
            )}

            {/* Text & Email Analysis */}
            {(q.type === QuestionType.TEXT || q.type === QuestionType.EMAIL) && (
               <div className="mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium text-slate-700">텍스트 응답 ({relevantResponses.length})</h4>
                  </div>

                  <ul className="space-y-2 max-h-60 overflow-y-auto bg-slate-50 p-4 rounded-lg print:max-h-none print:bg-transparent print:p-0 print:overflow-visible">
                     {relevantResponses.slice(0, q.type === QuestionType.EMAIL ? 100 : 10).map((resp, idx) => (
                        <li key={idx} className="text-slate-600 border-b border-slate-200 pb-2 last:border-0 text-sm">
                           {resp.answer}
                        </li>
                     ))}
                     {relevantResponses.length > 10 && q.type === QuestionType.TEXT && (
                       <li className="text-xs text-slate-400 italic print:hidden">외 {relevantResponses.length - 10}건...</li>
                     )}
                  </ul>
               </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
