
import React, { useState } from 'react';
import { Survey, UserType, TargetAudience } from './types';
import { SurveyView } from './pages/SurveyView';
import { AdminView } from './pages/AdminView';
import { PrintView } from './pages/PrintView';
import { getSurveys } from './services/db';
import { Users, Building2, Settings, CheckCircle2 } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'survey' | 'admin' | 'complete' | 'print'>('landing');
  const [userType, setUserType] = useState<UserType>(UserType.GENERAL);
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [printSurveyId, setPrintSurveyId] = useState<string | undefined>(undefined);

  // Landing Selection Logic
  const handleUserStart = async (type: UserType) => {
    const surveys = await getSurveys();
    
    // Filter Logic: Active AND (Matches type OR is for All)
    const targetAudience = type === UserType.EMPLOYEE ? TargetAudience.EMPLOYEE : TargetAudience.GENERAL;
    
    const availableSurveys = surveys.filter(s => 
      s.isActive && (s.targetAudience === TargetAudience.ALL || s.targetAudience === targetAudience)
    );
    
    // Pick the most recent one or the first one
    const survey = availableSurveys[0];
    
    if (survey) {
      setUserType(type);
      setActiveSurvey(survey);
      setView('survey');
    } else {
      alert('현재 참여 가능한 설문조사가 없습니다.');
    }
  };

  if (view === 'landing') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'rgb(248, 245, 243)' }}>
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* App Intro */}
          <div className="col-span-1 md:col-span-2 text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <img src="/logo.png" alt="로고" className="h-12 w-12 md:h-16 md:w-16 object-contain" />
              <h1 className="text-5xl font-bold tracking-tight text-slate-900">BO DUME 설문조사</h1>
            </div>
            <p className="text-xl text-slate-700">설문에 참여하실 대상을 선택해주세요.</p>
          </div>

          {/* General User Card */}
          <button 
            onClick={() => handleUserStart(UserType.GENERAL)}
            className="group bg-white rounded-3xl p-12 flex flex-col items-center justify-center gap-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] relative overflow-hidden"
          >
             <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
               <Users size={64} />
             </div>
             <h2 className="text-3xl font-bold text-slate-800">일반 고객</h2>
             <p className="text-center text-slate-500">방문객, 소비자 및 일반 사용자</p>
          </button>

          {/* Employee Card */}
          <button 
            onClick={() => handleUserStart(UserType.EMPLOYEE)}
            className="group bg-slate-800 border border-slate-700 rounded-3xl p-12 flex flex-col items-center justify-center gap-6 transition-all duration-300 hover:bg-slate-750 hover:border-blue-500 hover:scale-[1.02] hover:shadow-xl"
          >
             <div className="w-32 h-32 bg-slate-700 rounded-full flex items-center justify-center text-slate-300 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
               <Building2 size={64} />
             </div>
             <h2 className="text-3xl font-bold text-white">기업 고객 (임직원)</h2>
             <p className="text-center text-slate-400">내부 직원 및 관계자</p>
          </button>

          {/* Admin Link */}
          <div className="col-span-1 md:col-span-2 flex justify-center mt-8">
            <button onClick={() => setView('admin')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition text-sm uppercase tracking-widest font-semibold">
              <Settings size={16} /> 관리자 대시보드
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'survey' && activeSurvey) {
    return (
      <SurveyView 
        survey={activeSurvey} 
        userType={userType}
        onComplete={() => setView('complete')}
        onBackToLanding={() => setView('landing')}
      />
    );
  }

  if (view === 'complete') {
    return (
       <div className="min-h-screen bg-blue-600 flex items-center justify-center text-white">
         <div className="text-center animate-in zoom-in duration-500">
           <div className="flex items-center justify-center gap-6 mb-8">
             <img src="/logo.png" alt="로고" className="h-20 w-20 object-contain" />
             <div className="text-left">
               <h1 className="text-5xl font-bold mb-4">감사합니다!</h1>
               <p className="text-2xl text-blue-100">설문 응답이 성공적으로 제출되었습니다.</p>
             </div>
           </div>
           <button 
             onClick={() => setView('landing')}
             className="bg-white text-blue-900 px-10 py-4 rounded-full font-bold text-xl shadow-lg hover:bg-blue-50 transition hover:scale-105"
           >
             처음으로 돌아가기
           </button>
         </div>
       </div>
    );
  }

  if (view === 'admin') {
    return <AdminView onLogout={() => setView('landing')} onPrint={(surveyId) => { setPrintSurveyId(surveyId); setView('print'); }} />;
  }

  if (view === 'print') {
    return <PrintView surveyId={printSurveyId} onBack={() => { setPrintSurveyId(undefined); setView('landing'); }} />;
  }

  return <div>오류: 알 수 없는 상태입니다.</div>;
};

export default App;
