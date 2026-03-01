import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  UploadCloud,
  FileSpreadsheet,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  Layers,
  Save,
  X,
  ListChecks,
  AlertTriangle
} from 'lucide-react';
import { TaskDefinition, Procedure, Program } from '../types';
import { tasksService, BulkTaskImport } from '../src/services/tasks.service';
import { programsService } from '../src/services/programs.service';
import { useToast } from '../src/context/ToastContext';
import ConfirmationModal from '../src/components/ConfirmationModal';

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Bulk Upload State
  const [uploadMode, setUploadMode] = useState<'text' | 'file'>('text');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [appendMode, setAppendMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'Add' | 'Edit'>('Add');
  const { success, error: toastError } = useToast();

  const [currentTask, setCurrentTask] = useState<Partial<TaskDefinition>>({
    program: '',
    category: '',
    title: '',
    procedures: []
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [tasksData, programsData] = await Promise.all([
        tasksService.getAll(),
        programsService.getAll()
      ]);

      setTasks(tasksData);
      setPrograms(programsData);

      if (programsData.length > 0 && !selectedProgram) {
        setSelectedProgram(programsData[0].name);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data');
      toastError('Failed to fetch initial data');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to refresh just tasks
  const fetchTasks = async () => {
    const data = await tasksService.getAll();
    setTasks(data);
  };

  // Handlers
  const toggleExpand = (id: string) => {
    setExpandedTaskId(expandedTaskId === id ? null : id);
  };

  const toggleTaskSelection = (id: string) => {
    setSelectedTaskIds(prev =>
      prev.includes(id) ? prev.filter(taskId => taskId !== id) : [...prev, id]
    );
  };

  const handleSelectAllFilteredTasks = () => {
    if (selectedTaskIds.length === filteredTasks.length && filteredTasks.length > 0) {
      // Deselect all
      setSelectedTaskIds([]);
    } else {
      // Select all filtered
      setSelectedTaskIds(filteredTasks.map(t => t.id));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleSmartParse = async () => {
    if (!rawText.trim()) return;

    // Lazy load parser to avoid bundle size if not used? No, it's small.
    // Dynamic import optional but let's just import it at top.
    const { parseTasksFromText } = await import('../src/utils/taskParser');

    setIsUploading(true);
    try {
      const parsed = parseTasksFromText(rawText);

      if (parsed.length === 0) {
        toastError("Could not find any tasks. Ensure titles are CAPS and steps are numbered.");
        setIsUploading(false);
        return;
      }

      // Find selected program code
      const selectedProgObj = programs.find(p => p.name === selectedProgram);
      const pCode = selectedProgObj?.code || 'RGN';

      const payload: BulkTaskImport[] = parsed.map(t => ({
        programCode: pCode, // User selected program
        category: 'General', // Default category for smart parsed updates, user can edit later
        title: t.title,
        procedures: t.procedures
      }));

      setConfirmModal({
        isOpen: true,
        title: 'Confirm Bulk Import',
        message: `Found ${parsed.length} tasks. Proceed to import into ${selectedProgram}?`,
        onConfirm: async () => {
          try {
            const result = await tasksService.bulkImport(payload, appendMode);
            const { success: s, failed: f, created: c, updated: u, duplicates: d } = result.results;
            const dupMsg = d && d.length > 0 ? ` (Updated/Appended ${u} existing)` : '';
            success(`Import Complete! Success: ${s}, Failed: ${f}, Created: ${c}${dupMsg}`);
            setRawText('');
            fetchTasks();
          } catch (err) {
            toastError('Import failed');
          } finally {
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }
        }
      });

    } catch (err) {
      console.error('Smart parse error:', err);
      toastError('Failed to process text.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!uploadFile) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      // Parse CSV
      // Expected format: ProgramCode,Category,Title,TaskCode,Step,Description,MaxMarks
      try {
        const lines = text.split(/\r?\n/);
        const tasksMap = new Map<string, BulkTaskImport>();

        // Skip header row if present (assuming first row is header if it contains "Program")
        const startIdx = lines[0].toLowerCase().includes('program') ? 1 : 0;

        for (let i = startIdx; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Simple CSV entry parsing (doesn't handle quoted commas well, but sufficient for simple templates)
          const parts = line.split(',');
          if (parts.length < 5) continue;

          const [pCode, cat, title, tCode, stepStr, desc, marksStr] = parts.map(s => s.trim());

          // Key to group procedures by task
          // Use explicit TaskCode if available, otherwise combine Title+Category
          const key = tCode && tCode.length > 2 ? tCode : `${title}-${cat}`;

          if (!tasksMap.has(key)) {
            tasksMap.set(key, {
              programCode: pCode,
              category: cat,
              title: title,
              taskCode: tCode || undefined,
              procedures: []
            });
          }

          const task = tasksMap.get(key)!;
          task.procedures.push({
            step: parseInt(stepStr) || 0,
            description: desc.replace(/"/g, ''), // remove extra quotes if any (basic)
            maxMarks: parseInt(marksStr) || 0
          });
        }

        const payload = Array.from(tasksMap.values());

        if (payload.length === 0) {
          toastError("No valid tasks found in file.");
          setIsUploading(false);
          return;
        }

        const result = await tasksService.bulkImport(payload, appendMode);
        const { success: s, failed: f, created: c, updated: u, duplicates: d } = result.results;

        const msg = `Success: ${s}, Failed: ${f}, Created: ${c}` + (d && d.length > 0 ? ` (Updated ${u} existing)` : '');

        if (f > 0) {
          toastError(`Import Completed with Errors! ${msg}`);
        } else {
          success(`Import Complete! ${msg}`);
        }

        setUploadFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchTasks();

      } catch (err) {
        console.error('Parse error:', err);
        toastError('Failed to parse CSV file. Please check format.');
      } finally {
        setIsUploading(false);
      }
    };

    reader.readAsText(uploadFile);
  };

  const downloadTemplate = () => {
    const headers = "Program Code,Task Category,Task Title,Task Code (Optional),Step Number,Procedure Description,Max Marks";
    const sample1 = "RMW,Basic Nursing,Checking Vital Signs,,1,Wash hands and dry,2";
    const sample2 = "RMW,Basic Nursing,Checking Vital Signs,,2,Explain procedure to patient,3";
    const sample3 = "RGN,Medication,Intravenous Injection,T-IV-01,1,Verify patient identity,2";

    const csvContent = "data:text/csv;charset=utf-8," + [headers, sample1, sample2, sample3].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "tasks_upload_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Modal Handlers
  const openAddModal = () => {
    setModalMode('Add');
    setCurrentTask({
      program: selectedProgram,
      category: '',
      title: '',
      procedures: [{ id: Date.now().toString(), step: 1, description: '', maxMarks: 0 }]
    });
    setIsModalOpen(true);
  };

  const openEditModal = (task: TaskDefinition) => {
    setModalMode('Edit');
    // Deep copy procedures to avoid direct state mutation issues during edit
    setCurrentTask({
      ...task,
      procedures: task.procedures.map(p => ({ ...p }))
    });
    setIsModalOpen(true);
  };

  const handleTaskFieldChange = (field: keyof TaskDefinition, value: string) => {
    setCurrentTask(prev => ({ ...prev, [field]: value }));
  };

  const handleProcedureChange = (index: number, field: keyof Procedure, value: string | number) => {
    const updatedProcedures = [...(currentTask.procedures || [])];
    updatedProcedures[index] = { ...updatedProcedures[index], [field]: value };
    setCurrentTask(prev => ({ ...prev, procedures: updatedProcedures }));
  };

  const addProcedureRow = () => {
    setCurrentTask(prev => ({
      ...prev,
      procedures: [
        ...(prev.procedures || []),
        { id: Date.now().toString(), step: (prev.procedures?.length || 0) + 1, description: '', maxMarks: 0 }
      ]
    }));
  };

  const removeProcedureRow = (index: number) => {
    const updatedProcedures = (currentTask.procedures || []).filter((_, i) => i !== index);
    // Re-index steps
    const reindexed = updatedProcedures.map((p, i) => ({ ...p, step: i + 1 }));
    setCurrentTask(prev => ({ ...prev, procedures: reindexed }));
  };

  const saveTask = async () => {
    if (!currentTask.title || !currentTask.program) return;

    try {
      if (modalMode === 'Add') {
        await tasksService.create(currentTask);
      } else if (currentTask.id) {
        await tasksService.update(currentTask.id, currentTask);
      }
      setIsModalOpen(false);
      fetchTasks();
      success('Task saved successfully');
    } catch (err) {
      console.error(err);
      toastError('Failed to save task');
    }
  };

  const deleteTask = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task? This cannot be undone.',
      onConfirm: async () => {
        try {
          await tasksService.delete(id);
          setTasks(tasks.filter(t => t.id !== id));
          setSelectedTaskIds(prev => prev.filter(taskId => taskId !== id));
          success('Task deleted successfully');
        } catch (err) {
          console.error(err);
          toastError('Failed to delete task');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedTaskIds.length === 0) return;

    setConfirmModal({
      isOpen: true,
      title: `Delete ${selectedTaskIds.length} Tasks`,
      message: `Are you sure you want to delete these ${selectedTaskIds.length} selected tasks? This will permanently erase their procedures and cannot be undone.`,
      onConfirm: async () => {
        try {
          await tasksService.bulkDelete(selectedTaskIds);
          success(`Successfully deleted ${selectedTaskIds.length} tasks`);
          setSelectedTaskIds([]);
          fetchTasks();
        } catch (err) {
          console.error(err);
          toastError('Failed to delete selected tasks');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Filter Logic
  const filteredTasks = tasks.filter(t =>
    t.program === selectedProgram &&
    (t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const calculateTotalMarks = (procedures: Procedure[]) => {
    return procedures.reduce((acc, curr) => acc + Number(curr.maxMarks || 0), 0);
  };

  return (
    <div className="space-y-6">

      {/* 1. Bulk Upload Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-blue-50/50 flex justify-between items-center">
          <h2 className="text-gray-700 font-bold text-sm uppercase flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-blue-600" />
            Task Importer
          </h2>
          <div className="flex bg-white rounded-lg p-1 border border-gray-200">
            <button
              onClick={() => setUploadMode('text')}
              className={`px-3 py-1 text-xs font-bold rounded ${uploadMode === 'text' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Smart Text Paste
            </button>
            <button
              onClick={() => setUploadMode('file')}
              className={`px-3 py-1 text-xs font-bold rounded ${uploadMode === 'file' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              CSV File Upload
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="appendMode"
              checked={appendMode}
              onChange={(e) => setAppendMode(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="appendMode" className="text-sm text-gray-700 cursor-pointer font-bold" title="If checked, imported procedures will be added to the end of existing tasks matching the title, instead of replacing them.">
              Append to Existing Tasks
            </label>
          </div>
        </div>

        <div className="p-8">
          {uploadMode === 'text' ? (
            <div className="flex flex-col gap-4">
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg text-sm flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-bold">Instructions for PDF Paste:</p>
                  <ul className="list-disc ml-4 mt-1 space-y-1 text-xs">
                    <li>Open your PDF and select the text you want to import (Ctrl+A or select specific pages).</li>
                    <li>Copy and paste the text into the box below.</li>
                    <li>The system will automatically detect task titles (ALL CAPS lines) and numbered procedures.</li>
                    <li>Rating scales like "0 1 2 3 4" will be automatically cleaned up.</li>
                  </ul>
                </div>
              </div>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste your PDF text here..."
                className="w-full h-64 border border-gray-300 rounded-lg p-4 font-mono text-sm focus:outline-none focus:border-blue-500"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSmartParse}
                  disabled={isUploading || !rawText.trim()}
                  className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-bold shadow-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploading ? 'Parsing...' : 'Parse & Import Tasks'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors">
                <FileSpreadsheet className="w-12 h-12 text-green-600 mb-4" />
                <p className="text-gray-600 font-medium mb-1">Upload CSV Template</p>
                <p className="text-xs text-gray-400 mb-6">Import prepared CSV files</p>

                <div className="flex gap-4 items-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".csv"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {uploadFile ? 'Change File' : 'Select File'}
                  </button>
                  {uploadFile && (
                    <button
                      onClick={handleBulkUpload}
                      disabled={isUploading}
                      className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isUploading ? 'Importing...' : 'Upload & Process'}
                    </button>
                  )}
                </div>
                {uploadFile && <p className="mt-3 text-sm text-gray-600 flex items-center gap-2"><FileText className="w-4 h-4" /> {uploadFile.name}</p>}
              </div>
              <div className="mt-4 flex justify-center">
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline focus:outline-none"
                >
                  <Download className="w-4 h-4" /> Download template
                </button>
              </div>
            </>
          )}
        </div>
      </div>


      {/* 2. Controls Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
          <div className="w-full md:w-1/2 space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Select Program</label>
            <div className="relative">
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="w-full appearance-none border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white pr-8"
              >
                {programs.map(prog => <option key={prog.id} value={prog.name}>{prog.name}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
            {selectedTaskIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap border border-red-200"
              >
                <Trash2 className="w-4 h-4" /> Delete ({selectedTaskIds.length})
              </button>
            )}
            <div className="relative flex-1 md:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full border border-gray-300 rounded pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
            </div>
            <button
              onClick={openAddModal}
              className="bg-[#FF5722] hover:bg-[#F4511E] text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 shadow-sm uppercase whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> New Task
            </button>
          </div>
        </div>
      </div>

      {/* 3. Tasks List Section */}
      <div className="space-y-4 relative">
        {filteredTasks.length > 0 && (
          <div className="flex items-center gap-2 px-2 pb-2">
            <input
              type="checkbox"
              checked={selectedTaskIds.length === filteredTasks.length && filteredTasks.length > 0}
              onChange={handleSelectAllFilteredTasks}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-sm text-gray-500 font-medium cursor-pointer" onClick={handleSelectAllFilteredTasks}>
              Select All
            </span>
          </div>
        )}

        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200 border-dashed">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No tasks found for this program.</p>
            <p className="text-sm text-gray-400">Try creating a new task or changing the filter.</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div key={task.id} className={`bg-white rounded-lg shadow-sm border transition-colors overflow-hidden group ${selectedTaskIds.includes(task.id) ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-200'}`}>
              {/* Task Header / Card */}
              <div
                onClick={() => toggleExpand(task.id)}
                className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex items-center justify-center p-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedTaskIds.includes(task.id)}
                      onChange={() => toggleTaskSelection(task.id)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                  <div className="mt-1 p-2 bg-blue-50 rounded-lg text-blue-600">
                    <ListChecks className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{task.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide text-gray-600">{task.category}</span>
                      <span>•</span>
                      <span>{task.procedures.length} Procedures</span>
                      <span>•</span>
                      <span className="font-medium text-green-600">Total Marks: {calculateTotalMarks(task.procedures)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 mr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(task); }}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                      title="Edit Task"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors"
                      title="Delete Task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {expandedTaskId === task.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </div>

              {/* Expandable Procedures Section */}
              {expandedTaskId === task.id && (
                <div className="border-t border-gray-200 bg-gray-50/50 p-6 animate-[fadeIn_0.2s_ease-out]">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                    <Layers className="w-3 h-3" /> Procedures & Marks
                  </h4>
                  <div className="bg-white rounded border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead className="bg-gray-100 text-gray-600 font-semibold uppercase text-xs">
                        <tr>
                          <th className="py-2 px-4 w-16 text-center">Step</th>
                          <th className="py-2 px-4">Procedure Description</th>
                          <th className="py-2 px-4 w-32 text-center">Max Marks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {task.procedures.map((proc) => (
                          <tr key={proc.id}>
                            <td className="py-2 px-4 text-center font-mono text-gray-500">{proc.step}</td>
                            <td className="py-2 px-4 text-gray-800">{proc.description}</td>
                            <td className="py-2 px-4 text-center font-bold text-blue-600">{proc.maxMarks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 4. Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-lg shadow-xl relative flex flex-col max-h-[90vh] animate-[fadeIn_0.2s_ease-out]">
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-gray-200">
              <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                {modalMode === 'Add' ? <Plus className="w-6 h-6 text-blue-600" /> : <Edit className="w-6 h-6 text-blue-600" />}
                {modalMode} Task Definition
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Task Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Program</label>
                  <select
                    value={currentTask.program}
                    onChange={(e) => handleTaskFieldChange('program', e.target.value)}
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="" disabled>Select Program</option>
                    {programs.map(prog => <option key={prog.id} value={prog.name}>{prog.name} ({prog.code})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Task Category</label>
                  <input
                    type="text"
                    value={currentTask.category}
                    onChange={(e) => handleTaskFieldChange('category', e.target.value)}
                    placeholder="e.g. Basic Nursing, Obstetrics"
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Task Title</label>
                  <input
                    type="text"
                    value={currentTask.title}
                    onChange={(e) => handleTaskFieldChange('title', e.target.value)}
                    placeholder="e.g. Checking Vital Signs - Temperature"
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              {/* Procedures Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-gray-700">Procedures & Masks (Marks)</label>
                  <div className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded">
                    Total Marks: {calculateTotalMarks(currentTask.procedures as Procedure[] || [])}
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-100 text-xs font-bold text-gray-500 uppercase">
                      <tr>
                        <th className="py-2 px-3 w-12 text-center">#</th>
                        <th className="py-2 px-3">Description</th>
                        <th className="py-2 px-3 w-24 text-center">Marks</th>
                        <th className="py-2 px-3 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(currentTask.procedures || []).map((proc, index) => (
                        <tr key={index} className="group hover:bg-gray-50">
                          <td className="py-2 px-3 text-center text-gray-400 font-mono text-sm">
                            {index + 1}
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={proc.description}
                              onChange={(e) => handleProcedureChange(index, 'description', e.target.value)}
                              placeholder="Enter procedure step..."
                              className="w-full bg-transparent border-none focus:ring-0 p-1 text-sm text-gray-800 placeholder-gray-400"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={proc.maxMarks}
                              onChange={(e) => handleProcedureChange(index, 'maxMarks', e.target.value)}
                              min="0"
                              className="w-full border border-gray-300 rounded p-1 text-center text-sm font-bold text-blue-600 focus:border-blue-500"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => removeProcedureRow(index)}
                              className="text-gray-300 hover:text-red-500 transition-colors p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    onClick={addProcedureRow}
                    className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-blue-600 font-medium text-sm flex items-center justify-center gap-2 border-t border-gray-200 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Procedure Step
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveTask}
                className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-bold shadow-sm hover:bg-blue-700 flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" /> Save Task Definition
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default Tasks;