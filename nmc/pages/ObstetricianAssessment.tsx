import React, { useState } from 'react';
import { Student } from '../src/services/students.service';
import { ObstetricianResult } from '../types';
import { User, Save, AlertCircle, CheckCircle, ShieldOff } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { studentsService } from '../src/services/students.service';
import { resultsService } from '../src/services/results.service';
import { assessmentTypesService } from '../src/services/assessmentTypes.service';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext';
import { useToast } from '../src/context/ToastContext';
import AssessmentSettingsPanel from '../components/AssessmentSettingsPanel';

const TaskCompletionBadge: React.FC<{ studentId: number }> = ({ studentId }) => {
  const { data: completion } = useQuery({
    queryKey: ['task-completion', studentId],
    queryFn: () => studentsService.getTaskCompletion(studentId)
  });

  if (!completion) return null;

  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="px-2 py-1 bg-pink-100 text-pink-700 rounded text-xs font-bold flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        {completion.counts.obstetrician} Completed
      </div>
    </div>
  );
};

const ObstetricianAssessment: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [searchParams, setSearchParams] = useSearchParams();

  // Stage 1: Candidate, Stage 2: Assessment
  const [step, setStep] = useState<1 | 2>(1);
  const [searchIndex, setSearchIndex] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Sync URL to State
  React.useEffect(() => {
    const sId = searchParams.get('studentId');
    if (sId && !selectedStudent) {
      studentsService.getById(parseInt(sId))
        .then(s => {
          setSelectedStudent(s);
          setStep(2);
        })
        .catch(err => {
          console.error("Failed to restore student", err);
          setSearchParams({});
        });
    } else if (sId && selectedStudent && step === 1) {
      setStep(2);
    }
  }, [searchParams]);

  // State for multiple procedures (single examiner)
  const [procedures, setProcedures] = useState<Array<{
    id: number;
    name: string;
    score: number | '';
  }>>([
    { id: Date.now(), name: '', score: '' }
  ]);

  // Fetch results to track progress
  const { data: studentResultsData } = useQuery({
    queryKey: ['obstetrician-results', selectedStudent?.id],
    queryFn: () => selectedStudent ? resultsService.getAll({
      studentId: selectedStudent.id,
      examType: 'OBSTETRICIAN',
      includeAll: true,
      limit: 100
    }) : Promise.resolve({ results: [], pagination: undefined }),
    enabled: !!selectedStudent
  });

  const studentResults = studentResultsData?.results || [];

  const isFinalized = studentResults.some(r => r.isFinalSubmission);
  const assessmentCount = studentResults.filter(r => !r.isFinalSubmission).length;
  const hasUserAssessed = studentResults.some(r => r.creator?.id === user?.userId && !r.isFinalSubmission);
  const examiners = studentResults.filter(r => !r.isFinalSubmission).map(r => r.creator?.name || 'Unknown');

  // Queries & Mutations
  // Queries & Mutations
  // Removed global students fetch
  const [isSearching, setIsSearching] = useState(false);

  const submitMutation = useMutation({
    mutationFn: resultsService.submitObstetrician,
    onSuccess: (data: any) => {
      // Check if this triggers reconciliation
      if (data.needsReconciliation && data.reconciliationId) {
        success('Second assessment submitted! Redirecting to reconciliation...');
        navigate(`/obstetrician-reconciliation/${data.reconciliationId}`);
      } else {
        success('Assessment submitted successfully! Waiting for second examiner.');
        success('Assessment submitted successfully! Waiting for second examiner.');
        // Reset
        setSearchParams({});        // Reset
        setShowConfirmModal(false);
        setStep(1);
        setSearchIndex('');
        setSelectedStudent(null);
        setProcedures([{ id: Date.now(), name: '', score: '' }]);
      }
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || err.response?.data?.error || 'Failed to submit result');
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
        setSearchParams({ studentId: student.id.toString() });
        setStep(2);
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

  const updateProcedure = (id: number, field: string, value: any) => {
    setProcedures(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value === '' ? '' : (field === 'name' ? value : Number(value)) };
      }
      return p;
    }));
  };

  const calculateTotal = () => {
    return procedures.reduce((sum, p) => sum + (Number(p.score) || 0), 0);
  };

  const handleSubmit = () => {
    if (!selectedStudent || procedures.length === 0) return;

    // Validate empty
    const isValid = procedures.every(p => p.name && p.score !== '');
    if (!isValid) {
      toastError("Please ensure all procedures have names and scores.");
      return;
    }

    // Validate bounds
    const isBoundsValid = procedures.every(p => {
      const num = Number(p.score);
      return !isNaN(num) && num >= 0 && num <= 100;
    });

    if (!isBoundsValid) {
      toastError("Scores must be between 0 and 100.");
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmSubmit = () => {
    const totalScore = calculateTotal();
    const isValid = procedures.every(p => p.name && p.score !== '');

    if (selectedStudent && isValid && procedures.length > 0) {
      submitMutation.mutate({
        studentId: selectedStudent.id,
        procedure: "Obstetrician Assessment", // Generic title
        score: totalScore,
        details: {
          procedures: procedures.map(p => ({ name: p.name, score: Number(p.score) }))
        }
      });
    } else {
      toastError("Please ensure all procedures have names and scores.");
    }
  };

  // ── Eligibility check ──────────────────────────────────────────────────────
  const { data: assessmentTypes = [] } = useQuery({
    queryKey: ['assessment-types'],
    queryFn: assessmentTypesService.getAll,
  });
  const obsType = assessmentTypes.find(
    (t) => t.code.toUpperCase() === 'OBSTETRICIAN'
  );
  const eligibleProgramIds: number[] = obsType?.programLinks
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
            assessmentCode="OBSTETRICIAN"
            assessmentName="Obstetrician"
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
                    <div className="text-[#4B5563] text-base">
                      Nursing and Midwifery Training School, Teshie
                      <div className="-ml-2 mt-2">
                        <TaskCompletionBadge studentId={selectedStudent.id} />
                      </div>
                    </div>
                  </div>

                  {/* Status Blocks & Not Eligible */}
                  {isNotEligible && (
                    <div className="mt-8 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm max-w-md">
                      <ShieldOff className="w-4 h-4 shrink-0" />
                      <div>
                        <span className="font-bold">Not Eligible</span> — this student's programme is not configured
                        for the Obstetrician assessment. Update the eligible programmes in the settings gear to include this programme.
                      </div>
                    </div>
                  )}

                  {!isNotEligible && (
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded border border-gray-100 max-w-md">
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase">Assessment Status</h4>
                        <p className="text-sm font-medium mt-1">
                          {isFinalized ? (
                            <span className="text-green-600">Fully Finalized</span>
                          ) : assessmentCount === 0 ? (
                            <span className="text-gray-500">Not yet assessed</span>
                          ) : (
                            <span className="text-blue-600">{assessmentCount}/2 Assessments Done</span>
                          )}
                        </p>
                        {examiners.length > 0 && !isFinalized && (
                          <p className="text-[10px] italic text-gray-500 mt-1">
                            Assessed by: {hasUserAssessed ? 'You' : examiners.join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {isFinalized && <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded">COMPLETE</span>}
                        {assessmentCount === 1 && <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded">1 LEFT</span>}
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
                      if (selectedStudent) setSearchParams({ studentId: selectedStudent.id.toString() });
                      setStep(2);
                    }}
                    disabled={isNotEligible || isFinalized || hasUserAssessed || assessmentCount >= 2}
                    className={`px-4 py-2.5 rounded text-sm font-bold shadow-sm transition-colors w-[140px] ${isNotEligible || isFinalized || hasUserAssessed || assessmentCount >= 2
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-[#536DFE] hover:bg-blue-700 text-white'
                      }`}
                  >
                    {isNotEligible ? 'Not Eligible' : isFinalized ? 'Finalized' : hasUserAssessed ? 'Assessed' : assessmentCount >= 2 ? 'Pending Rec.' : 'NEXT !'}
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
          Grading Obstetrician
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-700 uppercase">Assessment Procedures</h3>
              <button
                onClick={() => setProcedures([...procedures, { id: Date.now(), name: '', score: '' }])}
                className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded font-bold uppercase"
              >
                + Add Procedure
              </button>
            </div>

            <div className="space-y-3">
              {procedures.map((proc, index) => (
                <div key={proc.id} className="bg-gray-50 p-4 rounded border border-gray-200 relative group">
                  <button
                    onClick={() => setProcedures(procedures.filter(p => p.id !== proc.id))}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove"
                  >
                    <AlertCircle className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Procedure Name</label>
                      <input
                        type="text"
                        value={proc.name}
                        onChange={(e) => updateProcedure(proc.id, 'name', e.target.value)}
                        className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                        placeholder="e.g. Perineal Repair"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Score (0-100)</label>
                      <input
                        type="number"
                        min="0" max="100"
                        value={proc.score}
                        onChange={(e) => updateProcedure(proc.id, 'score', e.target.value)}
                        className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500 font-bold"
                        placeholder="0-100"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {procedures.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded">
                  No procedures added yet. Click "+ Add Procedure" to start.
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-100 p-4 rounded flex justify-between items-center border border-gray-200">
            <span className="font-bold text-gray-700 uppercase text-sm">Total Score</span>
            <span className="text-2xl font-bold text-blue-600">{calculateTotal()}%</span>
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
          disabled={submitMutation.isPending || procedures.length === 0}
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

export default ObstetricianAssessment;