import React from 'react';
import { ShoppingCart, Banknote, Users, ClipboardCheck, Activity } from 'lucide-react';
import { useAuth } from '../src/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { studentsService } from '../src/services/students.service';
import { programsService } from '../src/services/programs.service';
import { resultsService } from '../src/services/results.service';
import StatCard from '../src/components/StatCard';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  // Normalize role to Title Case for comparison (handles ADMINISTRATOR vs Administrator)
  const rawRole = user?.role || 'Administrator';
  const userRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();

  // Fetch students execution - just to get total count
  const { data: studentsData } = useQuery({
    queryKey: ['students-count'],
    queryFn: () => studentsService.getAll({ limit: 1 }),
  });

  // Fetch programs count
  const { data: programsData } = useQuery({
    queryKey: ['programs-all'],
    queryFn: () => programsService.getAll(),
  });

  // Fetch results to calculate today and this week
  const { data: resultsData } = useQuery({
    queryKey: ['results-all-dashboard'],
    queryFn: () => resultsService.getAll({
      limit: 1000,
      ...(userRole === 'Examiner' ? { includeAll: true } : {})
    }),
  });

  const candidateCount = studentsData?.pagination?.total || 0;
  const programCount = programsData?.length || 0;

  // Calculate date-based stats
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).getTime();

  const resultsList = resultsData?.results || [];

  const getUniqueStudentsCount = (results: any[]) => {
    const studentIds = new Set(results.map(r => r.studentId));
    return studentIds.size;
  };

  const todaysAssessments = getUniqueStudentsCount(resultsList.filter(r => new Date(r.createdAt).getTime() >= startOfToday));
  const thisWeekAssessments = getUniqueStudentsCount(resultsList.filter(r => new Date(r.createdAt).getTime() >= startOfWeek));

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${userRole === 'Administrator' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
        <StatCard
          title="Number of Programs"
          count={programCount}
          colorClass="bg-[#F85A7E] bg-gradient-to-r from-[#F85A7E] to-[#F1638D]"
          icon={ShoppingCart}
        />
        {userRole === 'Administrator' && (
          <StatCard
            title="Number of Candidates"
            count={candidateCount}
            colorClass="bg-[#1BB3FA] bg-gradient-to-r from-[#1BB3FA] to-[#34BEFE]"
            icon={Banknote}
          />
        )}
        <StatCard
          title="Students Assessed This Week"
          count={thisWeekAssessments}
          colorClass="bg-[#FEB144] bg-gradient-to-r from-[#FEB144] to-[#F2B961]"
          icon={Users}
        />
        <StatCard
          title="Students Assessed Today"
          count={todaysAssessments}
          colorClass="bg-[#41B855] bg-gradient-to-r from-[#41B855] to-[#51C765]"
          icon={Users}
        />
      </div>

      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-8 flex flex-col items-center justify-center text-center ${userRole === 'Administrator' ? 'h-80' : 'h-[60vh] mt-8'}`}>
        <div className={`${userRole === 'Administrator' ? 'bg-gray-50' : 'bg-blue-50 shadow-inner'} p-6 rounded-full mb-4`}>
          <Activity className={`w-12 h-12 ${userRole === 'Administrator' ? 'text-gray-400' : 'text-blue-500'}`} />
        </div>
        <h3 className={`${userRole === 'Administrator' ? 'text-lg text-gray-700' : 'text-3xl text-gray-800'} font-bold`}>Welcome, {user?.name}</h3>
        <p className={`${userRole === 'Administrator' ? 'text-gray-500 max-w-md' : 'text-gray-500 max-w-lg text-lg'} mt-2`}>
          {userRole === 'Administrator'
            ? 'Use the sidebar to manage users, programs, candidates, and tasks.'
            : 'Select an assessment type from the sidebar to begin grading candidates.'}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;