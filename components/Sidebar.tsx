import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { assessmentTypesService } from '../src/services/assessmentTypes.service';
import {
  Briefcase,
  UserPlus,
  Users,
  FileText,
  Download,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Activity,
  FileSpreadsheet,
  Stethoscope,
  PenTool,
  LayoutDashboard,
  BookOpen,
  HeartPulse,
  Settings as SettingsIcon,
  X,
  UserCheck,
  ClipboardCheck
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  isOpen: boolean;
  userRole: 'ADMINISTRATOR' | 'EXAMINER';
  onMobileClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, isOpen, userRole, onMobileClose }) => {
  const [adminOpen, setAdminOpen] = useState(true);
  const [downloadsOpen, setDownloadsOpen] = useState(false);
  const [pracOpen, setPracOpen] = useState(false);
  const [cpOpen, setCpOpen] = useState(false);
  const [csOpen, setCsOpen] = useState(false);
  const [obsOpen, setObsOpen] = useState(false);
  const navigate = useNavigate();

  // Fetch assessment types to check active status
  const { data: assessmentTypes = [] } = useQuery({
    queryKey: ['assessment-types'],
    queryFn: assessmentTypesService.getAll,
    staleTime: 60_000, // Cache for 1 minute
  });

  // Helper: is a given assessment code active? (defaults true if no record exists yet)
  const isAssessmentActive = (code: string) => {
    const found = assessmentTypes.find(
      (t) => t.code.toUpperCase() === code.toUpperCase()
    );
    // If no record exists, treat as active; else use the flag
    return found ? found.isActive : true;
  };

  // For examiners: only show active assessments
  const showAssessment = (code: string) =>
    userRole === 'ADMINISTRATOR' || isAssessmentActive(code);

  const handleNavigation = (page: string, route: string) => {
    setCurrentPage(page);
    navigate(route);
    // Explicitly close if window is less than 768px wide
    if (window.innerWidth < 768 && onMobileClose) {
      onMobileClose();
    }
  };

  const navItemClass = (id: string) => `
    flex items-center px-4 py-3 cursor-pointer text-sm font-medium transition-colors
    ${currentPage === id
      ? 'text-blue-600 border-r-4 border-blue-600 bg-blue-50'
      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
  `;

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Brand header — ALWAYS visible to fill the top-left 64px area */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2 text-xl font-bold text-gray-800">
          <Activity className="w-6 h-6" />
          <span>Test App</span>
        </div>
        {/* Mobile Close Button - ONLY visible on mobile drawer overlay */}
        <button
          onClick={onMobileClose}
          className="md:hidden p-1 hover:bg-gray-100 rounded-full text-gray-500"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 pt-4">

        {/* Dashboard Link - Available to Everyone */}
        <div onClick={() => handleNavigation('dashboard', '/dashboard')} className={navItemClass('dashboard')}>
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </div>
        </div>

        {/* Examiner Specific Menus - 1:1 Reference App Structure */}
        {
          userRole === 'EXAMINER' && (
            <div className="mt-2 space-y-1">
              {showAssessment('PRACTICAL') && (
                <>
                  <div
                    className="flex items-center justify-between px-4 py-3 text-gray-700 cursor-pointer font-medium text-sm hover:bg-gray-50"
                    onClick={() => setPracOpen(!pracOpen)}
                  >
                    <div className="flex items-center gap-3">
                      <Activity className="w-5 h-5" />
                      <span>Practical Exams</span>
                    </div>
                    {pracOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                  {pracOpen && (
                    <div className="bg-gray-50/50">
                      <div onClick={() => handleNavigation('practical_exams', '/practical-exams')} className={navItemClass('practical_exams')}>
                        <span className="ml-[30px] font-normal">Select Candidate</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {showAssessment('CARE_PLAN') && (
                <>
                  <div
                    className="flex items-center justify-between px-4 py-3 text-gray-700 cursor-pointer font-medium text-sm hover:bg-gray-50"
                    onClick={() => setCpOpen(!cpOpen)}
                  >
                    <div className="flex items-center gap-3">
                      <PenTool className="w-5 h-5" />
                      <span>Care Plan</span>
                    </div>
                    {cpOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                  {cpOpen && (
                    <div className="bg-gray-50/50">
                      <div onClick={() => handleNavigation('assess_care_plan', '/assess-care-plan')} className={navItemClass('assess_care_plan')}>
                        <span className="ml-[30px] font-normal">Add Care Plan</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {showAssessment('CARE_STUDY') && (
                <>
                  <div
                    className="flex items-center justify-between px-4 py-3 text-gray-700 cursor-pointer font-medium text-sm hover:bg-gray-50"
                    onClick={() => setCsOpen(!csOpen)}
                  >
                    <div className="flex items-center gap-3">
                      <Stethoscope className="w-5 h-5" />
                      <span>Care Study</span>
                    </div>
                    {csOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                  {csOpen && (
                    <div className="bg-gray-50/50">
                      <div onClick={() => handleNavigation('assess_care_study', '/assess-care-study')} className={navItemClass('assess_care_study')}>
                        <span className="ml-[30px] font-normal">Add Care Study</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {showAssessment('OBSTETRICIAN') && (
                <>
                  <div
                    className="flex items-center justify-between px-4 py-3 text-gray-700 cursor-pointer font-medium text-sm hover:bg-gray-50"
                    onClick={() => setObsOpen(!obsOpen)}
                  >
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-5 h-5" />
                      <span>Obstetrician</span>
                    </div>
                    {obsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                  {obsOpen && (
                    <div className="bg-gray-50/50">
                      <div onClick={() => handleNavigation('assess_obstetrician', '/assess-obstetrician')} className={navItemClass('assess_obstetrician')}>
                        <span className="ml-[30px] font-normal">Add Scores</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div onClick={() => handleNavigation('reconciliation_list', '/reconciliation-list')} className={navItemClass('reconciliation_list')}>
                <div className="flex items-center gap-3 w-full">
                  <ClipboardList className="w-5 h-5" />
                  <span>Reconciliations</span>
                </div>
              </div>

              <div onClick={() => handleNavigation('my_assessments', '/my-assessments')} className={navItemClass('my_assessments')}>
                <div className="flex items-center gap-3 w-full">
                  <ClipboardCheck className="w-5 h-5" />
                  <span>My Assessments</span>
                </div>
              </div>
            </div>
          )
        }

        {/* Administration Group - Admin Only */}
        {
          userRole === 'ADMINISTRATOR' && (
            <>
              <div
                className="flex items-center justify-between px-4 py-3 text-blue-600 bg-blue-50 cursor-pointer font-semibold text-sm mt-2"
                onClick={() => setAdminOpen(!adminOpen)}
              >
                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5" />
                  <span>Administration</span>
                </div>
                {adminOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>

              {adminOpen && (
                <div className="bg-white">
                  <div onClick={() => handleNavigation('users', '/users')} className={navItemClass('users')}>
                    <Users className="w-5 h-5 mr-3" />
                    System Users
                  </div>

                  <div onClick={() => handleNavigation('programs', '/programs')} className={navItemClass('programs')}>
                    <ClipboardList className="w-5 h-5 mr-3" />
                    Programs
                  </div>

                  <div onClick={() => handleNavigation('candidates', '/candidates')} className={navItemClass('candidates')}>
                    <UserPlus className="w-5 h-5 mr-3" />
                    Candidates
                  </div>

                  <div onClick={() => handleNavigation('examiners', '/examiners')} className={navItemClass('examiners')}>
                    <UserCheck className="w-5 h-5 mr-3" />
                    Examiners
                  </div>

                  <div onClick={() => handleNavigation('tasks', '/tasks')} className={navItemClass('tasks')}>
                    <FileText className="w-5 h-5 mr-3" />
                    Task Repository
                  </div>
                </div>
              )}
            </>
          )
        }

        {/* Downloads Group - Admin Only */}
        {
          userRole === 'ADMINISTRATOR' && (
            <>
              <div
                className="flex items-center justify-between px-4 py-3 text-gray-700 cursor-pointer font-semibold text-sm hover:bg-gray-50 mt-2"
                onClick={() => setDownloadsOpen(!downloadsOpen)}
              >
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5" />
                  <span>Downloads</span>
                </div>
                {downloadsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>

              {downloadsOpen && (
                <div className="bg-white">
                  <div onClick={() => handleNavigation('practical_results', '/practical-results')} className={navItemClass('practical_results')}>
                    <Activity className="w-5 h-5 mr-3" />
                    Practical Results
                  </div>
                  <div onClick={() => handleNavigation('care_study', '/care-study-results')} className={navItemClass('care_study')}>
                    <FileSpreadsheet className="w-5 h-5 mr-3" />
                    Care Study
                  </div>
                  <div onClick={() => handleNavigation('care_plan', '/care-plan-results')} className={navItemClass('care_plan')}>
                    <ClipboardList className="w-5 h-5 mr-3" />
                    Care Plan
                  </div>
                  <div onClick={() => handleNavigation('obstetrician', '/obstetrician-results')} className={navItemClass('obstetrician')}>
                    <Stethoscope className="w-5 h-5 mr-3" />
                    Obstetrician Result
                  </div>
                </div>
              )}
            </>
          )
        }

        {/* System & Configuration - Separate Section */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            System
          </div>

          <div onClick={() => handleNavigation('settings', '/settings')} className={navItemClass('settings')}>
            <div className="flex items-center gap-3">
              <SettingsIcon className="w-5 h-5" />
              <span>Settings</span>
            </div>
          </div>

          {userRole === 'ADMINISTRATOR' && (
            <div onClick={() => handleNavigation('audit', '/audit')} className={navItemClass('audit')}>
              <div className="flex items-center gap-3">
                <ClipboardList className="w-5 h-5" />
                <span>Audit Log</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;