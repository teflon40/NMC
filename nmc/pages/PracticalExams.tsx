import React, { useState, useMemo } from 'react';
import { Student } from '../src/services/students.service';
import { TaskDefinition } from '../types';
import { Search, User, ChevronLeft, Save, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { studentsService } from '../src/services/students.service';
import { resultsService } from '../src/services/results.service';
import { CheckCircle } from 'lucide-react';
import { useToast } from '../src/context/ToastContext';
import { useAuth } from '../src/context/AuthContext';

const TaskCompletionBadge: React.FC<{ studentId: number }> = ({ studentId }) => {
  const { data: completion } = useQuery({
    queryKey: ['task-completion', studentId],
    queryFn: () => studentsService.getTaskCompletion(studentId)
  });

  if (!completion) return null;

  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        {completion.counts.practical} Practical Tasks Completed
      </div>
    </div>
  );
};

// Mock Tasks with numeric IDs to match backend expectation
// In a real scenario, these would come from an API
const MOCK_TASKS: any[] = [
  {
    id: 1,
    program: 'Registered Midwifery(PNNM)',
    category: 'Basic Nursing',
    title: 'Checking Vital Signs - Temperature',
    procedures: [
      { id: 'p1', step: 1, description: 'Wash hands and dry', maxMarks: 2 },
      { id: 'p2', step: 2, description: 'Explain procedure to patient', maxMarks: 3 },
      { id: 'p3', step: 3, description: 'Shake thermometer to below 35°C', maxMarks: 5 },
      { id: 'p4', step: 4, description: 'Place in axilla for 3-5 minutes', maxMarks: 10 },
      { id: 'p5', step: 5, description: 'Read and record temperature', maxMarks: 5 },
    ]
  },
  {
    id: 2,
    program: 'Registered General Nursing',
    category: 'Medication',
    title: 'Administration of Tablet',
    procedures: [
      { id: 'p1', step: 1, description: 'Verify patient identity', maxMarks: 5 },
      { id: 'p2', step: 2, description: 'Check prescription chart', maxMarks: 5 },
      { id: 'p3', step: 3, description: 'Offer water to patient', maxMarks: 2 },
    ]
  },
  {
    id: 3,
    program: 'Registered Midwifery(PNNM)',
    category: 'Post NAC NAP',
    title: 'Giving Health Education on Birth Preparedness',
    procedures: [
      { id: 'p1', step: 1, description: 'Greet client and introduce self', maxMarks: 2 },
      { id: 'p2', step: 2, description: 'Explain purpose of education', maxMarks: 3 },
      { id: 'p3', step: 3, description: 'Discuss danger signs in pregnancy', maxMarks: 5 },
      { id: 'p4', step: 4, description: 'Discuss importance of skilled delivery', maxMarks: 5 },
    ]
  }
];

const PracticalExams: React.FC = () => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Search/Candidate View, 2: Task Selection, 3: Grading
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [searchIndex, setSearchIndex] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [error, setError] = useState('');

  // Task Selection State
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Fetch Students
  const { data: studentsData } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentsService.getAll(),
  });
  const students = (studentsData as any)?.data || [];

  const navigate = useNavigate();

  // Fetch Task Completion & Limit for Selected Student
  const { data: completionData } = useQuery({
    queryKey: ['task-completion', selectedStudent?.id],
    queryFn: () => studentsService.getTaskCompletion(selectedStudent!.id),
    enabled: !!selectedStudent
  });

  const practicalCount = completionData?.counts?.practical || 0;
  const maxTasks = completionData?.programMaxTasks || 1;
  const limitReached = practicalCount >= maxTasks;

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: (data: any) => resultsService.submitDualPractical(data),
    onSuccess: (data: any) => {
      // Check if this triggers reconciliation
      // Check if this triggers reconciliation
      // Backend returns { result, needsReconciliation: true, assessments: [...] }
      // reconciliationId is inside result object
      const recId = data.result?.reconciliationId || data.assessments?.[0]?.reconciliationId || data.reconciliationId;

      if (data.needsReconciliation && recId) {

        success('Second assessment submitted! Redirecting to reconciliation...');
        // Navigate to PRACTICAL reconciliation page
        navigate(`/practical-reconciliation/${recId}`);
      } else {
        success('Assessment submitted successfully!');
        // Reset
        setShowConfirmModal(false);
        setStep(1);
        setSearchIndex('');
        setSelectedStudent(null);
        setSelectedTask(null);
        setScores({});
      }
    },
    onError: (err: any) => {
      toastError(`Failed to submit result: ${err.message}`);
    }
  });

  // --- STEP 1 LOGIC ---
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const student = (students as any[]).find(s => s.indexNo.toLowerCase() === searchIndex.trim().toLowerCase());
    if (student) {
      setSelectedStudent(student);
      setError('');
    } else {
      setSelectedStudent(null);
      setError('Candidate not found.');
    }
  };

  const handleNextToTasks = () => {
    if (selectedStudent) {
      setStep(2);
      // Set default category if available
      // Need to handle if program is object or string (depending on API return)
      const progName = typeof selectedStudent.program === 'object' ? (selectedStudent.program as any).name : selectedStudent.program;

      const studTasks = MOCK_TASKS.filter(t => t.program === progName);
      if (studTasks.length > 0) {
        setSelectedCategory(studTasks[0].category);
      }
    }
  };

  // --- STEP 2 LOGIC ---
  const availableTasks = useMemo(() => {
    if (!selectedStudent) return [];
    const progName = typeof selectedStudent.program === 'object' ? (selectedStudent.program as any).name : selectedStudent.program;
    return MOCK_TASKS.filter(t => t.program === progName);
  }, [selectedStudent]);

  const categories = useMemo(() => {
    const cats = new Set(availableTasks.map(t => t.category));
    return Array.from(cats);
  }, [availableTasks]);

  const filteredTasks = availableTasks.filter(t => t.category === selectedCategory);

  const handleSelectTask = (task: any) => {
    setSelectedTask(task);
    // Initialize scores
    const initialScores: Record<string, number> = {};
    task.procedures.forEach((p: any) => initialScores[p.id] = 0);
    setScores(initialScores);
    setStep(3);
  };

  // --- STEP 3 LOGIC (Grading) ---
  const handleScoreChange = (procedureId: string, value: number, maxMarks: number) => {
    const validScore = Math.min(Math.max(0, value), Number(maxMarks));
    setScores(prev => ({ ...prev, [procedureId]: validScore }));
  };

  const calculateTotalScore = () => {
    return Object.values(scores).reduce((a: number, b: number) => a + b, 0);
  };

  const calculateMaxTotal = () => {
    if (!selectedTask) return 0;
    return selectedTask.procedures.reduce((acc: number, curr: any) => acc + Number(curr.maxMarks), 0);
  };

  const calculatePercentage = () => {
    const total = calculateTotalScore();
    const max = calculateMaxTotal();
    return max === 0 ? 0 : Math.round(((total as any) / (max as any)) * 100);
  };

  const handleSubmit = () => {
    if (selectedStudent && selectedTask) {
      const score = calculatePercentage();
      submitMutation.mutate({
        studentId: selectedStudent.id,
        taskId: selectedTask.id,
        score: score,
        details: {
          rawScores: scores,
          totalMarks: calculateTotalScore(),
          maxMarks: calculateMaxTotal()
        }
      });
    }
  };

  // --- RENDERERS ---

  if (step === 1) {
    return (
      <div className="bg-white rounded-sm shadow-sm border border-gray-200 min-h-[600px] animate-[fadeIn_0.3s_ease-out]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30">
          <h2 className="text-sm font-bold text-[#4B5563] uppercase tracking-wide">SELECT CANDIDATE</h2>
        </div>

        <div className="p-8 max-w-4xl mx-auto mt-6">
          {/* Search Bar - Centered 1:1 Reference Style */}
          <form onSubmit={handleSearch} className="flex justify-center mb-12">
            <div className="flex w-full max-w-lg shadow-sm">
              <input
                type="text"
                value={searchIndex}
                onChange={(e) => setSearchIndex(e.target.value)}
                placeholder="Enter Index No."
                className="flex-1 border border-blue-200 rounded-l px-4 py-2.5 text-sm text-gray-700 bg-blue-50/10 focus:outline-none focus:border-blue-400 focus:bg-white placeholder-gray-400"
              />
              <button
                type="submit"
                className="bg-blue-50 text-blue-700 border border-l-0 border-blue-200 hover:bg-blue-100 px-6 py-2.5 text-xs font-bold uppercase rounded-r transition-colors"
              >
                Search Now
              </button>
            </div>
          </form>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded flex items-center justify-center gap-2 text-sm max-w-lg mx-auto">
              <AlertCircle className="w-4 h-4" /> {error}
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

                  <div className="mt-4">
                    <TaskCompletionBadge studentId={selectedStudent.id} />
                  </div>
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
                  {!limitReached && (
                    <button
                      onClick={handleNextToTasks}
                      className="bg-[#536DFE] hover:bg-blue-700 text-white px-8 py-2.5 rounded text-sm font-bold shadow-sm transition-colors w-[140px]"
                    >
                      NEXT !
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Limit Warning */}
          {
            limitReached && (
              <div className="mt-8 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-orange-800 uppercase">Maximum Tasks Reached</h4>
                  <p className="text-sm text-orange-700 mt-1">
                    This student has completed {practicalCount} out of {maxTasks} allowed practical tasks for their program.
                    No further tasks can be initiated.
                  </p>
                </div>
              </div>
            )
          }

          {/* Next Button */}
          <div className="flex justify-end mt-8">
            <button
              onClick={handleNextToTasks}
              disabled={limitReached}
              className={`px-8 py-3 rounded text-sm font-bold uppercase shadow-sm transition-colors ${limitReached
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-[#536DFE] hover:bg-blue-700 text-white'
                }`}
            >
              Next !
            </button>
          </div>
        </div >
      </div >
    );
    if (step === 2 && selectedStudent) {
      const progName = typeof selectedStudent.program === 'object' ? (selectedStudent.program as any).name : selectedStudent.program;

      return (
        <div className="bg-white rounded-sm shadow-sm border border-gray-200 min-h-[600px] flex flex-col animate-[fadeIn_0.3s_ease-out]">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30">
            <h2 className="text-sm font-bold text-[#4B5563] uppercase tracking-wide">
              SELECT A TASK FOR CANDIDATE ({selectedStudent.indexNo})
            </h2>
          </div>

          <div className="flex-1 p-8 max-w-5xl mx-auto w-full">
            {availableTasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>No tasks configured for this candidate's program.</p>
              </div>
            ) : (
              <div className="space-y-12">

                {/* Task Selector Dropdown */}
                <div>
                  <select
                    className="w-full border border-gray-300 rounded px-4 py-3 text-gray-700 text-sm focus:outline-none focus:border-blue-500 bg-white"
                    value={selectedTask?.id || ''}
                    onChange={(e) => {
                      const task = availableTasks.find(t => t.id === Number(e.target.value));
                      if (task) handleSelectTask(task);
                    }}
                  >
                    <option value="">Select Task</option>
                    {availableTasks.map(t => (
                      <option key={t.id} value={t.id}>{t.title} ({t.category})</option>
                    ))}
                  </select>
                </div>

                {/* Task Performed Table UI */}
                <div className="border border-gray-200 rounded overflow-hidden">
                  <div className="bg-[#F8FAFC] px-4 py-3 border-b border-gray-200">
                    <h3 className="text-sm font-bold text-blue-600 uppercase">Task Performed</h3>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#536DFE] text-white text-xs uppercase font-semibold">
                        <th className="px-4 py-3 w-16 border-r border-[#4A62E4]">#</th>
                        <th className="px-4 py-3 border-r border-[#4A62E4]">Task Category</th>
                        <th className="px-4 py-3">Task</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Placeholder for completed tasks, ideally fetched from backend */}
                      {practicalCount === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-4 text-center text-sm text-gray-500 bg-white">
                            No tasks recorded yet
                          </td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-4 flex items-center gap-2 text-sm text-green-600 bg-white">
                            <CheckCircle className="w-4 h-4" /> Candidate has completed {practicalCount} task(s).
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="px-8 py-6 border-t border-gray-100 bg-gray-50 flex items-center">
            <button
              onClick={() => setStep(1)}
              className="flex items-center justify-center bg-[#1BB3FA] hover:bg-blue-500 text-white px-6 py-2 rounded text-sm font-bold transition-colors"
            >
              &lt;&lt; BACK
            </button>
          </div>
        </div>
      );
    }

    if (step === 3 && selectedTask && selectedStudent) {
      return (
        <div className="space-y-4">
          {/* Info Banner */}
          <div className="bg-blue-600 text-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold uppercase">{selectedTask.title}</h2>
                <p className="text-blue-100 text-sm mt-1">{selectedTask.category}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">{selectedStudent.lastname} {selectedStudent.othernames}</p>
              </div>
            </div>
          </div>

          {/* Grading Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-700 text-sm uppercase">Assessment Rubric</h3>
              <span className="text-xs bg-white border border-gray-200 px-3 py-1 rounded-full text-gray-500 font-mono">
                Total Marks: {calculateMaxTotal()}
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {selectedTask.procedures.map((proc: any) => (
                <div key={proc.id} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50">
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                      {proc.step}
                    </div>
                    <p className="text-gray-800 text-sm mt-1.5">{proc.description}</p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end">
                    <label className="text-[10px] uppercase font-bold text-gray-400 mb-1">Score (0-{proc.maxMarks})</label>
                    <input
                      type="number"
                      min="0"
                      max={proc.maxMarks}
                      value={scores[proc.id]}
                      onChange={(e) => handleScoreChange(proc.id, parseInt(e.target.value) || 0, proc.maxMarks)}
                      className="w-20 border border-gray-300 rounded px-2 py-1.5 font-bold text-blue-600 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <div>
                <p className="text-gray-500 text-xs uppercase font-bold">Total Score</p>
                <p className="text-2xl font-bold text-gray-800">{calculateTotalScore()} <span className="text-sm text-gray-400 font-normal">/ {calculateMaxTotal()}</span></p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={submitMutation.isPending}
                  className="px-6 py-2 bg-green-600 text-white rounded text-sm font-bold hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> Submit
                </button>
              </div>
            </div>
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
                  {user?.name ? user.name.split(' ')[0] : 'Examiner'}, Do you want to submit these scores for Index No. <span className="font-bold">{selectedStudent.indexNumber}</span> ?
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={handleSubmit}
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
    }

    return <div>Error state</div>;
  }
};
export default PracticalExams;