import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext';
import {
    Save,
    AlertCircle,
    Search,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    ListChecks,
    ArrowRight,
    ArrowLeft,
    Play,
    ShieldOff
} from 'lucide-react';
import { studentsService, Student } from '../src/services/students.service';
import { tasksService } from '../src/services/tasks.service';
import { resultsService, ExamResult } from '../src/services/results.service';
import { TaskDefinition } from '../types';
import { useToast } from '../src/context/ToastContext';
import ReconciliationModal from '../components/ReconciliationModal';
import ConfirmationModal from '../src/components/ConfirmationModal';
import AssessmentSettingsPanel from '../components/AssessmentSettingsPanel';
import { assessmentTypesService } from '../src/services/assessmentTypes.service';

const PracticalAssessment: React.FC = () => {
    const { success, error: toastError } = useToast();

    const [searchParams, setSearchParams] = useSearchParams();

    // Stage 1: Candidate, Stage 2: Task Selection, Stage 3: Assessment
    // Step is derived from what is selected/in URL, but we keep local state for UI transition
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Selection State
    const [searchIndex, setSearchIndex] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [selectedTask, setSelectedTask] = useState<TaskDefinition | null>(null);

    // Sync URL to State on Mount / Change
    useEffect(() => {
        const sId = searchParams.get('studentId');
        const tId = searchParams.get('taskId');

        if (sId && !selectedStudent) {
            // Fetch student if in URL but not loaded
            studentsService.getById(parseInt(sId))
                .then(s => {
                    setSelectedStudent(s);
                    if (!tId) setStep(2);
                })
                .catch(err => {
                    console.error("Failed to restore student from URL", err);
                    setSearchParams({}); // Clear invalid params
                });
        }

        if (tId && !selectedTask) {
            // Fetch task if in URL
            tasksService.getById(tId)
                .then(t => {
                    setSelectedTask(t);
                    setStep(3);
                })
                .catch(err => {
                    console.error("Failed to restore task from URL", err);
                    // Don't clear everything, maybe just task
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('taskId');
                    setSearchParams(newParams);
                });
        }

        // If both present, ensure we are on step 3
        if (sId && tId) {
            setStep(3);
        } else if (sId) {
            setStep(2);
        } else {
            setStep(1);
        }

    }, [searchParams]); // Depend on searchParams to react to back/forward navigation
    const [error, setError] = useState('');

    // Assessment State (for single task in stage 3)
    const [ratings, setRatings] = useState<Record<number, number>>({});
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

    // Confirmation Modal State
    const [confirmation, setConfirmation] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type?: 'danger' | 'warning' | 'info';
    } | null>(null);

    // Success Modal State
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Reconciliation State
    const [showReconciliation, setShowReconciliation] = useState(false);
    const [reconciliationAssessments, setReconciliationAssessments] = useState<ExamResult[]>([]);
    const [reconciliationId, setReconciliationId] = useState<string | null>(null);

    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Fetch existing results for selected student to mark completed tasks
    const { data: studentResultsData } = useQuery({
        queryKey: ['student-results', selectedStudent?.id],
        queryFn: () => selectedStudent ? resultsService.getAll({
            studentId: selectedStudent.id,
            examType: 'PRACTICAL',
            includeAll: true,
            limit: 100 // Fetch reasonably enough results
        }) : Promise.resolve({ results: [], pagination: undefined }),
        enabled: !!selectedStudent
    });

    const studentResults = studentResultsData?.results || [];

    const completedTaskIds = useMemo(() => {
        return new Set(studentResults.map(r => r.taskId));
    }, [studentResults]);

    // Data Fetching - Students list removed in favor of search

    // Fetch task status for the selected student
    const { data: taskStatusData } = useQuery({
        queryKey: ['student-task-status', selectedStudent?.id],
        queryFn: () => selectedStudent ? resultsService.getStudentTaskStatus(selectedStudent.id) : Promise.resolve([]),
        enabled: !!selectedStudent && step === 2,
        refetchInterval: 5000 // Poll every 5s to keep status fresh
    });

    const { data: tasks = [] } = useQuery({
        queryKey: ['tasks'],
        queryFn: tasksService.getAll,
    });

    const { data: assessmentTypesData = [] } = useQuery({
        queryKey: ['assessment-types'],
        queryFn: assessmentTypesService.getAll,
    });

    // Create a map for quick lookup of task status
    const taskStatusMap = useMemo(() => {
        const map = new Map<number, any>();
        taskStatusData?.forEach(status => {
            map.set(status.taskId, status);
        });
        return map;
    }, [taskStatusData]);

    // Check if any task is in progress or pending reconciliation (locks ALL other tasks)
    const activeTaskInProgress = useMemo(() => {
        return taskStatusData?.find(s => s.status === 'in_progress' || s.status === 'pending_reconciliation');
    }, [taskStatusData]);

    // Check if the student has completed their required 2 tasks
    const finalizedTasks = useMemo(() => {
        return taskStatusData?.filter(s => s.status === 'finalized' || s.isFinal) || [];
    }, [taskStatusData]);

    const maxTasks = selectedStudent && typeof selectedStudent.program === 'object' ? (selectedStudent.program as any).maxTasks || 1 : 1;
    const studentDone = finalizedTasks.length >= maxTasks;

    // Identify if a task is actively being assessed by someone else (locks concurrent starts)
    const lockedToTaskId = useMemo(() => {
        const pending = taskStatusData?.find(s => s.status === 'pending_reconciliation');
        if (pending) return pending.taskId;
        const inProgress = taskStatusData?.find(s => s.status === 'in_progress');
        if (inProgress) return inProgress.taskId;
        return null;
    }, [taskStatusData]);


    // Mutations
    const submitMutation = useMutation({
        mutationFn: resultsService.submitDualPractical,
        onSuccess: (data) => {
            if (data.needsReconciliation && data.assessments) {
                // Second assessor just submitted - show reconciliation
                setReconciliationAssessments(data.assessments);
                setReconciliationId(data.result.reconciliationId!);
                setShowReconciliation(true);
                success('Assessment submitted! Reconciliation required.');
            } else {
                // First assessor submitted
                success('Assessment Submitted! Waiting for second assessor.');
                // Update local status map optimistically or refetch
                queryClient.invalidateQueries({ queryKey: ['student-task-status'] });
                setShowSuccessModal(true);
            }
            setConfirmation(null);
            queryClient.invalidateQueries({ queryKey: ['student-results'] });
        },
        onError: (err: any) => {
            console.error(err);
            toastError(err.response?.data?.error || 'Failed to submit assessment. Please try again.');
        }
    });

    const finalSubmitMutation = useMutation({
        mutationFn: ({ reconciliationId, selectedProcedures, notes }: { reconciliationId: string; selectedProcedures: any; notes: string }) =>
            resultsService.submitPracticalFinalResult(reconciliationId, selectedProcedures, notes),
        onSuccess: () => {
            success('Final result submitted successfully!');
            setShowReconciliation(false);
            setShowSuccessModal(true);
            queryClient.invalidateQueries({ queryKey: ['student-results'] });
            queryClient.invalidateQueries({ queryKey: ['pending-reconciliations'] });
        },
        onError: (err: any) => {
            console.error(err);
            toastError('Failed to submit final result.');
        }
    });

    const resetForm = () => {
        setSearchParams({}); // Clear URL
        setStep(1);
        setSearchIndex('');
        setSelectedStudent(null);
        setSelectedTask(null);
        setRatings({});
        setExpandedTaskId(null);
        setError('');
        setConfirmation(null);
        setShowSuccessModal(false);
        window.scrollTo(0, 0);
    };

    const handleAssessAnother = () => {
        // Keep studentId, remove taskId
        if (selectedStudent) {
            setSearchParams({ studentId: selectedStudent.id.toString() });
        } else {
            setSearchParams({});
        }
        setStep(2);
        setSelectedTask(null);
        setRatings({});
        setExpandedTaskId(null);
        setError('');
        setConfirmation(null);
        setShowSuccessModal(false);
        window.scrollTo(0, 0);
    };

    const [isSearching, setIsSearching] = useState(false);

    const handleSearchStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchIndex.trim()) return;

        setIsSearching(true);
        try {
            // Search by Index Number
            // Note: backend search matches indexNo OR names. exact match is better for unique ID.
            const response = await studentsService.getAll({ search: searchIndex, limit: 10 });
            const found = response.students.find(s => s.indexNo.trim().toUpperCase() === searchIndex.trim().toUpperCase());

            if (found) {
                setSelectedStudent(found);
                setError('');
            } else {
                setSelectedStudent(null);
                setError('Student not found with that Index Number.');
            }
        } catch (err) {
            console.error(err);
            setError('Failed to search student.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleProceedToTaskSelection = () => {
        if (!selectedStudent) {
            setError('Please find a valid candidate first.');
            return;
        }
        setSearchParams({ studentId: selectedStudent.id.toString() });
        setStep(2);
        window.scrollTo(0, 0);
    };

    const handleStartAssessment = (task: TaskDefinition) => {
        setSelectedTask(task);
        setRatings({}); // Reset ratings for new task

        if (selectedStudent) {
            setSearchParams({
                studentId: selectedStudent.id.toString(),
                taskId: task.id
            });
        }

        setStep(3);
        window.scrollTo(0, 0);
    };

    const toggleExpand = (taskId: string) => {
        setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
    };

    const handleRate = (step: number, rating: number) => {
        setRatings(prev => ({ ...prev, [step]: rating }));
    };

    // Calculate Scores live (for stage 3)
    const scoreData = useMemo(() => {
        if (!selectedTask) return { totalScore: 0, maxScore: 0, percentage: 0 };

        let totalScore = 0;
        let maxScore = 0;

        selectedTask.procedures.forEach(proc => {
            const rating = ratings[proc.step] || 0;
            totalScore += rating;
            maxScore += (proc.maxMarks || 4);
        });

        const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
        return { totalScore, maxScore, percentage: Math.round(percentage * 10) / 10 };
    }, [selectedTask, ratings]);

    const handleSubmit = () => {
        if (!selectedStudent || !selectedTask) return;

        const processSubmit = () => {
            const payload = {
                studentId: selectedStudent.id,
                taskId: parseInt(selectedTask.id as any),
                score: scoreData.percentage,
                examType: 'PRACTICAL' as const,
                details: {
                    rawScore: scoreData.totalScore,
                    maxScore: scoreData.maxScore,
                    procedureScores: ratings
                }
            };
            submitMutation.mutate(payload);
            setConfirmation(null);
        };

        // Validation: Warn if unrated steps exist
        const unrated = selectedTask.procedures.filter(p => ratings[p.step] === undefined);

        if (unrated.length > 0) {
            setConfirmation({
                isOpen: true,
                title: 'Incomplete Assessment',
                message: `You have ${unrated.length} unrated steps. They will be counted as 0. Are you sure you want to submit?`,
                type: 'warning',
                onConfirm: processSubmit
            });
            return;
        }

        setConfirmation({
            isOpen: true,
            title: 'Confirm Submission',
            message: `Submit score of ${scoreData.percentage}% for ${selectedTask.title}? This action cannot be undone.`,
            type: 'info',
            onConfirm: processSubmit
        });
    };

    const handleCancelAssessment = () => {
        setConfirmation({
            isOpen: true,
            title: 'Cancel Assessment?',
            message: 'All progress for this task will be lost. Are you sure you want to exit?',
            type: 'danger',
            onConfirm: () => {
                // Cancel assessment -> go back to step 2 (task selection)
                if (selectedStudent) {
                    setSearchParams({ studentId: selectedStudent.id.toString() });
                }
                setStep(2);
                setConfirmation(null);
            }
        });
    };

    // Filter tasks by student program
    const studentProgramName = selectedStudent
        ? (typeof selectedStudent.program === 'object' ? (selectedStudent.program as any).name : selectedStudent.program)
        : '';

    const availableTasks = useMemo(() => {
        if (!studentProgramName) return [];
        return tasks.filter(t => t.program === studentProgramName);
    }, [tasks, studentProgramName]);

    // ── Eligible Programs check for Practical ─────────────────────────────────
    const practicalType = assessmentTypesData?.find(
        (t: any) => t.code.toUpperCase() === 'PRACTICAL'
    );
    const practicalEligibleIds: number[] = practicalType?.programLinks
        ?.map((l: any) => l.programId ?? l.program?.id).filter(Boolean) ?? [];
    const studentProgId =
        typeof selectedStudent?.program === 'object'
            ? (selectedStudent.program as any)?.id : null;
    const isPracticalNotEligible =
        practicalEligibleIds.length > 0 &&
        studentProgId !== null &&
        !practicalEligibleIds.includes(studentProgId);


    // RENDER: Stage 1 - Candidate Verification
    if (step === 1) {
        return (
            <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-8 flex items-center gap-2 border-b pb-4">
                        <Search className="w-6 h-6 text-blue-600" />
                        Find Candidate
                        <div className="ml-auto">
                            <AssessmentSettingsPanel
                                assessmentCode="PRACTICAL"
                                assessmentName="Practical Exams"
                                accentColor="text-blue-500"
                            />
                        </div>
                    </h2>

                    <form onSubmit={handleSearchStudent} className="flex gap-3 mb-8">
                        <input
                            type="text"
                            value={searchIndex}
                            onChange={e => setSearchIndex(e.target.value)}
                            placeholder="Enter Index Number (e.g. NMC/24/...)"
                            className="flex-1 border border-gray-300 rounded-lg px-5 py-3 text-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                            autoFocus
                        />
                        <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-blue-700 shadow-sm transition-colors">
                            Search
                        </button>
                    </form>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-lg mb-6 flex items-center gap-3 border border-red-100">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    {selectedStudent && (
                        <div className={`border rounded-xl p-6 mb-8 flex items-start gap-5 shadow-sm ${isPracticalNotEligible
                            ? 'bg-red-50 border-red-200'
                            : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
                            }`}>
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl shadow-sm border ${isPracticalNotEligible
                                ? 'bg-red-100 text-red-500 border-red-200'
                                : 'bg-white text-blue-600 border-blue-100'
                                }`}>
                                {selectedStudent.lastname[0]}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-2xl text-gray-900">{selectedStudent.lastname} {selectedStudent.othernames}</h3>
                                <p className="text-gray-600 font-mono mt-1">{selectedStudent.indexNo}</p>
                                <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${isPracticalNotEligible
                                    ? 'bg-red-100 text-red-700 border-red-200'
                                    : 'bg-blue-100/50 text-blue-700 border-blue-200'
                                    }`}>
                                    <CheckCircle className="w-3 h-3" />
                                    {typeof selectedStudent.program === 'object' ? (selectedStudent.program as any).name : selectedStudent.program}
                                </div>
                                {isPracticalNotEligible && (
                                    <div className="mt-3 flex items-center gap-2 text-red-700 text-sm">
                                        <ShieldOff className="w-4 h-4 shrink-0" />
                                        <span><strong>Not Eligible</strong> — this student's programme is not configured for Practical Exams.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-6 border-t border-gray-100">
                        <button
                            onClick={handleProceedToTaskSelection}
                            disabled={!selectedStudent || isPracticalNotEligible}
                            className={`px-8 py-3 rounded-lg font-bold text-lg shadow flex items-center gap-2 transition-all transform active:scale-95 ${isPracticalNotEligible
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed'
                                }`}
                        >
                            {isPracticalNotEligible ? 'Programme Not Eligible' : <>Next: Select Task <ArrowRight className="w-5 h-5" /></>}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // RENDER: Stage 2 - Task Selection (with Status Indicators)
    if (step === 2 && selectedStudent) {
        return (
            <div className="max-w-4xl mx-auto animate-fadeIn">
                <button
                    onClick={() => {
                        setSelectedStudent(null);
                        setStep(1);
                        setSearchParams({});
                    }}
                    className="mb-6 flex items-center text-gray-500 hover:text-blue-600 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Search
                </button>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                    <div className="flex items-center justify-between mb-8 border-b pb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Select Procedure</h2>
                            <p className="text-gray-500 mt-1">Choose a task to assess for <span className="font-bold text-gray-900">{selectedStudent.lastname} {selectedStudent.othernames}</span></p>
                        </div>
                        <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-bold text-sm border border-blue-100">
                            {studentProgramName}
                        </div>
                    </div>

                    {studentDone && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3 text-green-800 animate-fadeIn">
                            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-sm">Practical Exam Completed</h4>
                                <p className="text-sm mt-1">
                                    This student's practical exam has been finalized for <strong>{maxTasks} required task{maxTasks !== 1 ? 's' : ''}</strong>.
                                    No further tasks can be started.
                                </p>
                            </div>
                        </div>
                    )}

                    {!studentDone && activeTaskInProgress && (
                        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3 text-yellow-800 animate-fadeIn">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-sm">Task in Progress</h4>
                                <p className="text-sm mt-1">
                                    Assessors are currently working on <strong>{activeTaskInProgress.taskTitle}</strong>.
                                    All other tasks are locked until this assessment is complete.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {availableTasks.map(task => {
                            const status = taskStatusMap.get(parseInt(task.id));
                            const isCompletedByMe = completedTaskIds.has(parseInt(task.id));

                            // Determine if this task can be selected
                            // 1. If finalized -> Disabled (Completed)
                            // 2. If pending reconciliation -> Disabled (Wait for reconciliation)
                            // 3. If another task is in progress AND this is not that task -> Disabled (Focus on active task)
                            // 4. If I have already assessed it -> Disabled (Done)

                            const isFinalized = status?.status === 'finalized' || status?.isFinal;
                            const isPendingRecon = status?.status === 'pending_reconciliation';
                            // Lock other tasks ONLY if one is actively being worked on (in progress / pending recon)
                            const isBlockedByOtherTask = lockedToTaskId !== null && lockedToTaskId !== parseInt(task.id);

                            const myName = user?.name || '';
                            const hasAssessed = status?.assessors.includes(myName);

                            // A task is disabled if:
                            // 1. The entire student is done (any task finalized)
                            // 2. It's finalized itself
                            // 3. Another task is the locked task
                            // 4. This examiner already assessed it
                            // 5. It's pending reconciliation (only reconciler should interact)
                            const isDisabled = studentDone || isFinalized || isBlockedByOtherTask || hasAssessed || isPendingRecon;

                            const isTheLockedTask = lockedToTaskId !== null && lockedToTaskId === parseInt(task.id);
                            const showAssignedHighlight = isTheLockedTask && !hasAssessed && !isFinalized && !isPendingRecon;

                            return (
                                <div
                                    key={task.id}
                                    onClick={() => !isDisabled && handleStartAssessment(task)}
                                    className={`
                                        border rounded-xl p-5 transition-all text-left relative overflow-hidden group
                                        ${isDisabled
                                            ? 'bg-gray-50 border-gray-200 opacity-80 cursor-not-allowed'
                                            : 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-md cursor-pointer'
                                        }
                                        ${status?.status === 'in_progress' ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/10' : ''}
                                        ${showAssignedHighlight ? 'ring-2 ring-green-500 border-green-400 bg-green-50/30' : ''}
                                    `}
                                >
                                    {/* Status Badge */}
                                    {status && (
                                        <div className="absolute top-0 right-0">
                                            {isFinalized && (
                                                <div className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-bl-lg border-b border-l border-green-200">
                                                    FINALIZED
                                                </div>
                                            )}
                                            {isPendingRecon && (
                                                <div className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-bl-lg border-b border-l border-amber-200 flex items-center gap-1">
                                                    <ListChecks className="w-3 h-3" /> PENDING RECON
                                                </div>
                                            )}
                                            {status.status === 'in_progress' && (
                                                <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg shadow-sm flex items-center gap-1 animate-pulse">
                                                    <Play className="w-3 h-3 fill-current" /> IN PROGRESS
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {/* Assigned Task Badge for 2nd examiner */}
                                    {showAssignedHighlight && (
                                        <div className="absolute top-0 right-0">
                                            <div className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg shadow-sm flex items-center gap-1">
                                                ★ ASSESS THIS TASK
                                            </div>
                                        </div>
                                    )}

                                    <h3 className={`font-bold text-lg mb-1 ${isDisabled ? 'text-gray-500' : 'text-gray-800 group-hover:text-blue-700'}`}>
                                        {task.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 mb-4">{task.category} • {task.procedures.length} Steps</p>

                                    {/* Assessment Progress Stats */}
                                    {status ? (
                                        <div className="mt-4 pt-3 border-t border-gray-100">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${isFinalized ? 'bg-green-500' : isPendingRecon ? 'bg-amber-500' : 'bg-blue-500'}`}
                                                        style={{ width: `${(status.assessmentCount / 2) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-gray-600">
                                                    {status.assessmentCount}/2
                                                </span>
                                            </div>

                                            {status.assessors.length > 0 && (
                                                <div className="text-xs text-gray-500 flex flex-wrap gap-1">
                                                    <span className="font-medium mr-1">Assessors:</span>
                                                    {status.assessors.map((name, i) => (
                                                        <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border
                                                            ${name === myName ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-100 text-gray-600 border-gray-200'}
                                                        `}>
                                                            {name === myName ? 'YOU' : name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                                            <span>No assessments yet</span>
                                            {!isDisabled && <span className="group-hover:translate-x-1 transition-transform">Start Now &rarr;</span>}
                                        </div>
                                    )}

                                    {/* Blocked Reason Message */}
                                    {isBlockedByOtherTask && !studentDone && (
                                        <div className="mt-2 text-xs font-medium text-red-500 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            Student assigned to another task — assess the highlighted task instead
                                        </div>
                                    )}
                                    {studentDone && !isFinalized && (
                                        <div className="mt-2 text-xs font-medium text-gray-500 flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" />
                                            Exam completed — no more tasks
                                        </div>
                                    )}

                                    {hasAssessed && !isFinalized && !isPendingRecon && (
                                        <div className="mt-2 text-xs font-medium text-blue-600 flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" />
                                            You have submitted
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // RENDER: Stage 3 - Assessment (Rating)
    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header / Context Bar - Sticky */}
            {/* Moved animate-fadeIn away from this parent to avoid stacking context issues with sticky */}
            <div className="bg-white sticky top-0 z-40 shadow-md border-b border-gray-200 px-6 py-4 flex justify-between items-center bg-opacity-95 backdrop-blur rounded-b-lg mb-6 transition-all">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleCancelAssessment}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                        title="Back to Task Selection"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="font-bold text-gray-800 text-lg leading-tight">{selectedTask?.title}</h2>
                        <p className="text-sm text-gray-500">
                            Candidate: <span className="font-bold text-gray-900">{selectedStudent?.lastname}</span>
                            <span className="mx-2">•</span>
                            Task Category: <span className="font-bold text-blue-600">{selectedTask?.category}</span>
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-black text-blue-600">{scoreData.percentage}%</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current Score</div>
                </div>
            </div>

            {/* Assessment UI */}
            <div className="space-y-6 animate-fadeIn">

                {/* Rating Key */}
                <div className="bg-white border border-gray-200 p-4 rounded-xl text-sm text-gray-600 flex flex-wrap gap-6 justify-center shadow-sm">
                    <span className="font-bold uppercase text-gray-400">Rating Key:</span>
                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span> 0 = Omitted</span>
                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500"></span> 1 = Poor</span>
                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> 2 = Fair</span>
                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span> 3 = Good</span>
                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span> 4 = Excellent</span>
                </div>

                {/* Procedures List */}
                <div className="space-y-4">
                    {selectedTask?.procedures.map((proc) => {
                        const currentRating = ratings[proc.step];
                        return (
                            <div
                                key={proc.step}
                                className={`bg-white rounded-xl border p-5 shadow-sm transition-all duration-200
                                    ${currentRating !== undefined ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-200'}
                                `}
                            >
                                <div className="flex flex-col md:flex-row md:items-start gap-4">
                                    <div className="flex gap-4 flex-1">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 border 
                                            ${currentRating !== undefined ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-400 border-gray-200'}
                                        `}>
                                            {proc.step}
                                        </div>
                                        <div className="flex-1 pt-1">
                                            <p className="text-gray-800 font-medium text-lg leading-snug">{proc.description}</p>
                                        </div>
                                    </div>

                                    {/* Rating Controls */}
                                    <div className="flex gap-1 shrink-0 pt-4 md:pt-0 justify-center">
                                        {[0, 1, 2, 3, 4].map((val) => (
                                            <label
                                                key={val}
                                                className={`
                                                    w-12 h-12 md:w-12 md:h-12 flex items-center justify-center rounded-lg cursor-pointer font-bold text-base transition-all select-none
                                                    ${currentRating === val
                                                        ? `scale-110 shadow-lg ring-2 ring-offset-2 ring-offset-white ${val === 0 ? 'bg-red-500 ring-red-500' :
                                                            val === 1 ? 'bg-orange-500 ring-orange-500' :
                                                                val === 2 ? 'bg-yellow-500 ring-yellow-500' :
                                                                    val === 3 ? 'bg-blue-500 ring-blue-500' :
                                                                        'bg-green-600 ring-green-600'
                                                        } text-white`
                                                        : 'bg-gray-50 border border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-600 hover:bg-white'
                                                    }
                                                `}
                                                title={`Rate ${val}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`proc-${proc.step}`}
                                                    className="hidden"
                                                    checked={ratings[proc.step] === val}
                                                    onChange={() => handleRate(proc.step, val)}
                                                />
                                                {val}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Actions */}
                <div className="pt-8 flex justify-end gap-4 border-t border-gray-200">
                    <button
                        onClick={handleCancelAssessment}
                        className="px-6 py-4 bg-gray-100 text-gray-600 font-bold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitMutation.isPending}
                        className="bg-green-600 text-white px-10 py-4 rounded-lg font-bold text-xl shadow-lg hover:bg-green-700 hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-3 transition-all transform active:scale-95"
                    >
                        {submitMutation.isPending ? 'Submitting...' : (
                            <>
                                <Save className="w-6 h-6" />
                                Submit Assessment
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Custom Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!confirmation}
                title={confirmation?.title || ''}
                message={confirmation?.message || ''}
                confirmText="Confirm"
                type={confirmation?.type || 'info'}
                onConfirm={() => confirmation?.onConfirm()}
                onCancel={() => setConfirmation(null)}
            />

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full animate-[fadeIn_0.3s_ease-out] text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Assessment Submitted!</h3>
                        <p className="text-gray-600 mb-8">
                            The practical assessment for <span className="font-bold">{selectedStudent?.lastname}</span> has been successfully recorded.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleAssessAnother}
                                className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 active:scale-95"
                            >
                                Assess Another Task
                            </button>
                            <button
                                onClick={resetForm}
                                className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors active:scale-95"
                            >
                                Finish & Return Home
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reconciliation Modal */}
            <ReconciliationModal
                isOpen={showReconciliation}
                onClose={() => setShowReconciliation(false)}
                assessments={reconciliationAssessments}
                onSubmitFinal={(selectedProcedures, notes) => {
                    if (reconciliationId) {
                        finalSubmitMutation.mutate({ reconciliationId, selectedProcedures, notes });
                    }
                }}
                isSubmitting={finalSubmitMutation.isPending}
            />
        </div>
    );
};

export default PracticalAssessment;
