import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Student } from '../src/services/students.service';
import { AlertCircle, User, ShieldOff } from 'lucide-react';
import { useToast } from '../src/context/ToastContext';
import { useMutation, useQuery } from '@tanstack/react-query';
import { studentsService } from '../src/services/students.service';
import { resultsService } from '../src/services/results.service';
import { assessmentTypesService } from '../src/services/assessmentTypes.service';
import AssessmentSettingsPanel from '../components/AssessmentSettingsPanel';
import { useAuth } from '../src/context/AuthContext';

// Per-program care plan topics (out of 20 each)
const CARE_PLAN_TOPICS: Record<string, string[]> = {
  RGN: ['RGN (Surgery)', 'RGN (Medicine)'],
  RMN: ['RMN (Psychiatry)', 'RMN (Community)'],
  RM: ['RM (Antenatal)', 'RM (Postnatal)'],
  RCN: ['RCN (Paediatrics)', 'RCN (Community)'],
};

function getTopicsForProgram(student: Student | null): string[] {
  if (!student) return ['Care Plan 1', 'Care Plan 2'];

  const progObj = student.program as any;
  const maxCarePlans = progObj && typeof progObj === 'object' && progObj.maxCarePlans ? progObj.maxCarePlans : 1;

  // Check against both the program name AND the program code/shortName
  const progName = (typeof progObj === 'object' ? progObj?.name : progObj) || '';
  const progCode = (typeof progObj === 'object' ? (progObj?.code || progObj?.shortName) : '') || '';
  const searchStrings = [progName.toUpperCase(), progCode.toUpperCase()];

  for (const key of Object.keys(CARE_PLAN_TOPICS)) {
    if (searchStrings.some(s => s.includes(key))) {
      const predefined = CARE_PLAN_TOPICS[key];
      return Array.from({ length: maxCarePlans }, (_, i) => predefined[i] || `Care Plan ${i + 1}`);
    }
  }

  return Array.from({ length: maxCarePlans }, (_, i) => `Care Plan ${i + 1}`);
}

const CarePlanAssessment: React.FC = () => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [searchIndex, setSearchIndex] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingTopic, setPendingTopic] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();

  // Scores: one per topic, initially empty strings
  const [scores, setScores] = useState<Record<string, string>>({});
  // Track which topics were submitted (to prevent duplicates in same session)
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});

  // Restore from URL
  useEffect(() => {
    const sId = searchParams.get('studentId');
    if (sId && !selectedStudent) {
      studentsService.getById(parseInt(sId))
        .then(s => { setSelectedStudent(s); setStep(2); })
        .catch(() => setSearchParams({}));
    }
  }, [searchParams]);



  const topics = getTopicsForProgram(selectedStudent);

  // Fetch existing results for selected student to lock already submitted topics
  const { data: studentResultsData } = useQuery({
    queryKey: ['care-plan-results', selectedStudent?.id],
    queryFn: () => selectedStudent ? resultsService.getAll({
      studentId: selectedStudent.id,
      examType: 'CARE_PLAN',
      includeAll: true,
      limit: 100
    }) : Promise.resolve({ results: [], pagination: undefined }),
    enabled: !!selectedStudent
  });

  const existingSubmittedTopics = React.useMemo(() => {
    const map: Record<string, boolean> = {};
    studentResultsData?.results?.forEach(r => {
      if (r.diagnosis) map[r.diagnosis] = true;
    });
    return map;
  }, [studentResultsData]);

  // ── Eligibility check ──────────────────────────────────────────────────────
  const { data: assessmentTypes = [] } = useQuery({
    queryKey: ['assessment-types'],
    queryFn: assessmentTypesService.getAll,
  });

  const carePlanType = assessmentTypes.find(
    (t) => t.code.toUpperCase() === 'CARE_PLAN'
  );

  // Build the set of eligible program IDs. If none configured, everyone is eligible.
  const eligibleProgramIds: number[] = carePlanType?.programLinks
    ?.map((l: any) => l.programId ?? l.program?.id)
    .filter(Boolean) ?? [];

  const studentProgramId =
    typeof selectedStudent?.program === 'object'
      ? (selectedStudent.program as any)?.id
      : null;

  // Not eligible if: a list exists AND the student's program is NOT in it
  const isNotEligible =
    eligibleProgramIds.length > 0 &&
    studentProgramId !== null &&
    !eligibleProgramIds.includes(studentProgramId);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchIndex.trim()) return;
    setIsSearching(true);
    try {
      const resp = await studentsService.getAll({ search: searchIndex, limit: 10 });
      const found = resp.students.find(
        s => s.indexNo.toLowerCase() === searchIndex.trim().toLowerCase()
      );
      if (found) {
        setSelectedStudent(found);
        setSearchError('');
        setScores({});
        setSubmitted({});
      } else {
        setSelectedStudent(null);
        setSearchError('Candidate not found.');
      }
    } catch {
      setSearchError('Search failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const submitMutation = useMutation({
    mutationFn: (payload: { topic: string; score: number }) =>
      resultsService.submitCarePlan({
        studentId: selectedStudent!.id,
        diagnosis: payload.topic,
        score: payload.score,
        examType: 'CARE_PLAN',
      } as any),
    onSuccess: (_data, vars) => {
      success(`${vars.topic} submitted successfully!`);
      setSubmitted(prev => ({ ...prev, [vars.topic]: true }));
      setShowConfirmModal(false);
      setPendingTopic(null);
    },
    onError: (err: any) => {
      toastError(`Submission error: ${err.message}`);
    },
  });

  const validateTopicScore = (topic: string, silent = false): boolean => {
    const raw = scores[topic];
    if (raw === '' || raw === undefined) {
      if (!silent) toastError('Please enter a score before submitting.');
      return false;
    }
    const numeric = parseFloat(raw);
    if (isNaN(numeric) || numeric < 0 || numeric > 20) {
      if (!silent) toastError('Score must be between 0 and 20.');
      return false;
    }
    return true;
  };

  const handlePreSubmitTopic = (topic: string) => {
    if (validateTopicScore(topic)) {
      setPendingTopic(topic);
      setShowConfirmModal(true);
    }
  };

  const handlePreSubmitAll = () => {
    const pending = topics.filter(t => !submitted[t] && !existingSubmittedTopics[t]);
    if (pending.length === 0) {
      toastError("Scores are already submitted for these topics.");
      return;
    }

    // Validate all pending topics.
    // Use everyday to ensure we don't spam 5 toast errors at once if multiple are invalid.
    let isValid = true;
    for (const topic of pending) {
      if (!validateTopicScore(topic)) {
        isValid = false;
        break; // Stop at first error
      }
    }

    if (isValid) {
      setPendingTopic('ALL');
      setShowConfirmModal(true);
    }
  };

  const executeSubmitTopic = (topic: string) => {
    const numeric = parseFloat(scores[topic]);
    submitMutation.mutate({ topic, score: numeric });
  };

  const executeSubmitAll = () => {
    const pending = topics.filter(t => !submitted[t] && !existingSubmittedTopics[t]);
    pending.forEach(topic => executeSubmitTopic(topic));
  };

  const handleConfirmSubmit = () => {
    if (pendingTopic === 'ALL') {
      executeSubmitAll();
    } else if (pendingTopic) {
      executeSubmitTopic(pendingTopic);
    }
    setShowConfirmModal(false);
    setPendingTopic(null);
  };

  // ── Step 1: Search ──────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="bg-white rounded-sm shadow-sm border border-gray-200 min-h-[600px] animate-[fadeIn_0.3s_ease-out]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#4B5563] uppercase tracking-wide">
            SELECT CANDIDATE
          </h2>
          <AssessmentSettingsPanel
            assessmentCode="CARE_PLAN"
            assessmentName="Care Plan"
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

          {searchError && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded flex items-center justify-center gap-2 text-sm max-w-lg mx-auto">
              <AlertCircle className="w-4 h-4" />{searchError}
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
                        for the Care Plan assessment. Update the eligible programmes in the settings gear to include this programme.
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

  // ── Step 2: Grading ─────────────────────────────────────────────────────────
  const programLabel =
    typeof selectedStudent?.program === 'object'
      ? (selectedStudent?.program as any)?.name ?? 'Programme'
      : selectedStudent?.program ?? 'Programme';

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
          Enter Careplan Scores
        </div>

        {/* Per-topic scoring rows */}
        <div className="space-y-4 mb-6">
          {topics.map(topic => {
            const isDone = submitted[topic] || existingSubmittedTopics[topic];
            return (
              <div
                key={topic}
                className={`flex items-center justify-between py-4 px-4 rounded border ${isDone ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
                  }`}
              >
                <span className="text-sm font-medium text-gray-700 w-48">{topic}</span>

                <div className="flex items-center gap-2">
                  {/* Decrement */}
                  <button
                    disabled={isDone}
                    onClick={() =>
                      setScores(prev => {
                        const cur = parseFloat(prev[topic] ?? '0') || 0;
                        return { ...prev, [topic]: String(Math.max(0, cur - 1)) };
                      })
                    }
                    className="w-8 h-8 bg-gray-100 border border-gray-300 rounded text-gray-600 font-bold hover:bg-gray-200 disabled:opacity-40"
                  >
                    −
                  </button>

                  {/* Score input — empty by default, max 20 */}
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step="any"
                    value={scores[topic] ?? ''}
                    disabled={isDone}
                    onChange={e => setScores(prev => ({ ...prev, [topic]: e.target.value }))}
                    placeholder=""
                    className="w-20 border border-gray-300 rounded px-3 py-2 text-center text-sm font-semibold focus:outline-none focus:border-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
                  />
                  <span className="text-xs text-gray-400">/ 20</span>

                  {/* Increment */}
                  <button
                    disabled={isDone}
                    onClick={() =>
                      setScores(prev => {
                        const cur = parseFloat(prev[topic] ?? '0') || 0;
                        return { ...prev, [topic]: String(Math.min(20, cur + 1)) };
                      })
                    }
                    className="w-8 h-8 bg-gray-100 border border-gray-300 rounded text-gray-600 font-bold hover:bg-gray-200 disabled:opacity-40"
                  >
                    +
                  </button>

                  {/* Per-topic submit */}
                  {isDone ? (
                    <span className="ml-2 text-xs font-bold text-green-600 uppercase">✓ Submitted</span>
                  ) : (
                    <button
                      onClick={() => handlePreSubmitTopic(topic)}
                      disabled={submitMutation.isPending}
                      className="px-6 py-2 bg-[#536DFE] hover:bg-blue-700 text-white text-xs font-bold uppercase rounded transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {submitMutation.isPending ? '...' : 'Submit'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Action Footer */}
      <div className="px-8 py-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
        <button
          onClick={() => {
            setSearchParams({});
            setStep(1);
            setSelectedStudent(null);
            setScores({});
            setSubmitted({});
          }}
          className="flex items-center justify-center bg-[#1BB3FA] hover:bg-blue-500 text-white px-6 py-2 rounded text-sm font-bold transition-colors"
        >
          &lt;&lt; BACK
        </button>
        <button
          onClick={handlePreSubmitAll}
          disabled={submitMutation.isPending || topics.every(t => submitted[t] || existingSubmittedTopics[t])}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded text-sm font-bold transition-colors disabled:opacity-40"
        >
          {submitMutation.isPending ? 'Submitting…' : 'Submit All Eligible'}
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
                onClick={handleConfirmSubmit}
                disabled={submitMutation.isPending}
                className="px-6 py-2.5 bg-[#3F51B5] hover:bg-blue-800 text-white rounded text-sm font-bold shadow-md transition-colors disabled:opacity-50"
              >
                {submitMutation.isPending ? 'Submitting...' : 'Yes, Submit Scores!'}
              </button>
              <button
                onClick={() => { setShowConfirmModal(false); setPendingTopic(null); }}
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

export default CarePlanAssessment;