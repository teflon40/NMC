import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Student } from '../src/services/students.service';
import { CareStudyResult } from '../types';
import { User, Save, AlertCircle, ShieldOff } from 'lucide-react';
import { useToast } from '../src/context/ToastContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { studentsService } from '../src/services/students.service';
import { resultsService } from '../src/services/results.service';
import { assessmentTypesService } from '../src/services/assessmentTypes.service';
import AssessmentSettingsPanel from '../components/AssessmentSettingsPanel';
import { useAuth } from '../src/context/AuthContext';

const CareStudyAssessment: React.FC = () => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [searchIndex, setSearchIndex] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Form State
  const [caseTitle, setCaseTitle] = useState('');
  const [score, setScore] = useState<number | ''>('');

  const [searchParams, setSearchParams] = useSearchParams();
  const [isSearching, setIsSearching] = useState(false);

  // Sync URL
  useEffect(() => {
    const sId = searchParams.get('studentId');
    if (sId && !selectedStudent) {
      studentsService.getById(parseInt(sId))
        .then(s => {
          setSelectedStudent(s);
          setStep(2);
        })
        .catch(() => setSearchParams({}));
    }
  }, [searchParams]);

  const submitMutation = useMutation({
    mutationFn: resultsService.submitCareStudy,
    onSuccess: () => {
      success('Care Study Result submitted successfully!');
      // Reset
      setShowConfirmModal(false);
      setStep(1);
      setSearchParams({});
      setSearchIndex('');
      setSelectedStudent(null);
      setCaseTitle('');
      setScore('');
    },
    onError: (err: any) => {
      toastError(`Error submitting result: ${err.message}`);
    }
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchIndex.trim()) return;

    setIsSearching(true);
    try {
      const response = await studentsService.getAll({ search: searchIndex, limit: 10 });
      const student = response.students.find(s => s.indexNo.toLowerCase() === searchIndex.trim().toLowerCase());

      if (student) {
        setSelectedStudent(student);
        setError('');
      } else {
        setSelectedStudent(null);
        setError('Candidate not found.');
      }
    } catch (err) {
      setError('Search failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = () => {
    if (!selectedStudent || !caseTitle || score === '') {
      toastError("Please fill all fields");
      return;
    }
    const numericScore = Number(score);
    if (isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
      toastError("Score must be between 0 and 100");
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmSubmit = () => {
    if (selectedStudent && caseTitle && score !== '') {
      submitMutation.mutate({
        studentId: selectedStudent.id,
        caseTitle: caseTitle,
        score: Number(score)
      });
    } else {
      toastError("Please fill all fields");
    }
  };

  // ── Eligibility check ──────────────────────────────────────────────────────
  const { data: assessmentTypes = [] } = useQuery({
    queryKey: ['assessment-types'],
    queryFn: assessmentTypesService.getAll,
  });
  const careStudyType = assessmentTypes.find(
    (t) => t.code.toUpperCase() === 'CARE_STUDY'
  );
  const eligibleProgramIds: number[] = careStudyType?.programLinks
    ?.map((l: any) => l.programId ?? l.program?.id).filter(Boolean) ?? [];
  const studentProgramId =
    typeof selectedStudent?.program === 'object'
      ? (selectedStudent.program as any)?.id : null;
  const isNotEligible =
    eligibleProgramIds.length > 0 &&
    studentProgramId !== null &&
    !eligibleProgramIds.includes(studentProgramId);

  if (step === 1) {
    return (
      <div className="bg-white rounded-sm shadow-sm border border-gray-200 min-h-[600px] animate-[fadeIn_0.3s_ease-out]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#4B5563] uppercase tracking-wide">
            SELECT CANDIDATE
          </h2>
          <AssessmentSettingsPanel
            assessmentCode="CARE_STUDY"
            assessmentName="Care Study"
            accentColor="text-blue-600"
          />
        </div>

        <div className="p-8 max-w-4xl mx-auto mt-6">
          {/* Search Bar - Centered 1:1 Reference Style */}
          <form onSubmit={handleSearch} className="flex justify-center mb-12">
            <div className="flex w-full max-w-lg shadow-sm">
              <input
                type="text"
                value={searchIndex}
                onChange={e => setSearchIndex(e.target.value)}
                placeholder="Enter Index No."
                className="flex-1 border border-blue-200 rounded-l px-4 py-2.5 text-sm text-gray-700 bg-blue-50/10 focus:outline-none focus:border-blue-400 focus:bg-white placeholder-gray-400"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="bg-blue-50 text-blue-700 border border-l-0 border-blue-200 hover:bg-blue-100 px-6 py-2.5 text-xs font-bold uppercase rounded-r transition-colors disabled:opacity-50"
              >
                {isSearching ? '...' : 'Search Now'}
              </button>
            </div>
          </form>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded flex items-center justify-center gap-2 text-sm max-w-lg mx-auto">
              <AlertCircle className="w-4 h-4" />{error}
            </div>
          )}

          {/* Candidate Profile View - 1:1 Layout */}
          {selectedStudent && (
            <div className="animate-[fadeIn_0.3s_ease-out] border-t border-gray-100 pt-10">
              <div className="flex flex-col md:flex-row justify-between items-start">

                {/* Left Info Column */}
                <div className="flex-1 space-y-8 pl-4">
                  <div className="flex items-center">
                    <h3 className="w-40 text-[#1F2937] font-bold text-base">Name</h3>
                    <p className="text-[#4B5563] text-base">{selectedStudent.lastname} {selectedStudent.othernames}</p>
                  </div>

                  <div className="flex items-center">
                    <h3 className="w-40 text-[#1F2937] font-bold text-base">Index No.</h3>
                    <p className="text-[#4B5563] text-base">{selectedStudent.indexNo}</p>
                  </div>

                  <div className="flex items-center">
                    <h3 className="w-40 text-[#1F2937] font-bold text-base">Program</h3>
                    <p className="text-[#4B5563] text-base">
                      {typeof selectedStudent.program === 'object' ? (selectedStudent.program as any).name : selectedStudent.program}
                    </p>
                  </div>

                  <div className="flex items-center">
                    <h3 className="w-40 text-[#1F2937] font-bold text-base">School</h3>
                    <p className="text-[#4B5563] text-base">Nursing and Midwifery Training School, Teshie</p>
                  </div>

                  {/* Not eligible banner */}
                  {isNotEligible && (
                    <div className="mt-8 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm max-w-md">
                      <ShieldOff className="w-4 h-4 shrink-0" />
                      <div>
                        <span className="font-bold">Not Eligible</span> — this student's programme is not configured
                        for the Care Study assessment. Update the eligible programmes in the settings gear to include this programme.
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Photo Column & Next Button */}
                <div className="w-48 shrink-0 flex flex-col items-center gap-6 mt-8 md:mt-0 mr-8">
                  <div className="w-[140px] h-[160px] bg-[#E2E8F0] border border-gray-200 flex flex-col items-center justify-center relative rounded shadow-sm">
                    <div className="absolute top-4 w-16 h-16 bg-[#94A3B8] rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                      <User className="w-10 h-10 text-white mt-2" />
                    </div>
                    <div className="absolute bottom-6 w-full text-center">
                      <span className="bg-[#94A3B8] text-white text-xs font-semibold px-4 py-1 rounded-full">
                        No Photo
                      </span>
                    </div>
                  </div>

                  {/* The NEXT ! button */}
                  <button
                    onClick={() => {
                      setSearchParams({ studentId: selectedStudent.id.toString() });
                      setStep(2);
                    }}
                    disabled={isNotEligible}
                    className={`px-8 py-2.5 rounded text-sm font-bold shadow-sm transition-colors w-[140px] ${isNotEligible
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-[#536DFE] hover:bg-blue-700 text-white'
                      }`}
                  >
                    NEXT !
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-sm shadow-sm border border-gray-200 min-h-[600px] flex flex-col animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30">
        <h2 className="text-sm font-bold text-[#4B5563] uppercase tracking-wide">
          SELECT A TASK FOR CANDIDATE ({selectedStudent?.indexNo})
        </h2>
      </div>

      <div className="flex-1 p-8 max-w-5xl mx-auto w-full">
        {/* Instruction banner */}
        <div className="mb-8 text-sm font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200 pb-2">
          Grading Care Study
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Patient / Case Study Title</label>
            <input
              type="text"
              value={caseTitle}
              onChange={(e) => setCaseTitle(e.target.value)}
              className="w-full border border-gray-300 rounded p-3 text-sm focus:outline-none focus:border-blue-500"
              placeholder="e.g. Management of severe pre-eclampsia"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Total Score (%)</label>
            <input
              type="number"
              min="0" max="100"
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="w-full border border-gray-300 rounded p-3 text-sm focus:outline-none focus:border-blue-500 font-bold text-lg"
              placeholder="0-100"
            />
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-8 py-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
        <button
          onClick={() => {
            setSearchParams({});
            setStep(1);
          }}
          className="flex items-center justify-center bg-[#1BB3FA] hover:bg-blue-500 text-white px-6 py-2 rounded text-sm font-bold transition-colors"
        >
          &lt;&lt; BACK
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitMutation.isPending}
          className="bg-[#536DFE] hover:bg-blue-700 text-white px-8 py-2 rounded text-sm font-bold uppercase transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {submitMutation.isPending ? 'Submitting...' : <><Save className="w-4 h-4" /> Submit Result</>}
        </button>
      </div>

      {/* Confirm Action Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center animate-[scaleIn_0.2s_ease-out]">
            <div className="mx-auto w-20 h-20 border-4 border-orange-200 rounded-full flex items-center justify-center mb-6">
              <span className="text-4xl text-orange-400 font-bold">!</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-700 mb-4">Confirm Action</h2>
            <p className="text-gray-600 mb-8">
              {user?.name ? user.name.split(' ')[0] : 'Examiner'}, Do you want to submit these scores for Index No. <span className="font-bold">{selectedStudent?.indexNo}</span> ?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={confirmSubmit}
                disabled={submitMutation.isPending}
                className="px-6 py-2.5 bg-[#3F51B5] hover:bg-blue-800 text-white rounded text-sm font-bold shadow-md transition-colors disabled:opacity-50"
              >
                {submitMutation.isPending ? 'Submitting...' : 'Yes, Submit Scores!'}
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={submitMutation.isPending}
                className="px-6 py-2.5 bg-[#DB4437] hover:bg-red-700 text-white rounded text-sm font-bold shadow-md transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CareStudyAssessment;