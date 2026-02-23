import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Download,
  User,
  Plus,
  Search,
  Edit,
  Trash2,
  UploadCloud,
  X,
  Save,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  CheckSquare,
  ArrowUpCircle
} from 'lucide-react';
import ConfirmationModal from '../src/components/ConfirmationModal';
import { Student } from '../types';
import { studentsService } from '../src/services/students.service';
import { useToast } from '../src/context/ToastContext';
import {
  exportToExcel,
  exportToPDF,
  copyToClipboard,
  printTable,
  downloadCandidatesTemplate
} from '../src/utils/exportUtils';
import { useAuth } from '../src/context/AuthContext';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import ImportPreviewModal from '../src/components/ImportPreviewModal';

// Program options removed - will be fetched from API

const levelOptions = ['Year 1', 'Year 2', 'Year 3'];

const Candidates: React.FC = () => {
  const { success, error: toastError } = useToast();
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [programs, setPrograms] = useState<any[]>([]);

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState<number | undefined>();

  useEffect(() => {
    fetchStudents();
  }, [page, limit, appliedSearchQuery, selectedProgramId]);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const data = await import('../src/services/programs.service').then(m => m.programsService.getAll());
      // Filter only active programs
      const activePrograms = data.filter((p: any) => p.status === 'ACTIVE');
      setPrograms(activePrograms);
    } catch (err) {
      console.error('Failed to fetch programs', err);
    }
  };

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const response = await studentsService.getAll({
        page,
        limit,
        search: appliedSearchQuery,
        programId: selectedProgramId
      });

      const studentsData = response.students || [];
      const pagination = response.pagination;

      if (pagination) {
        setTotalPages(pagination.totalPages);
        setTotalStudents(pagination.total);
      }

      const sanitizedData = studentsData.map((s: any) => ({
        ...s,
        program: s.program?.name || s.program || 'Unknown',
        lastname: s.lastname || '',
        othernames: s.othernames || '',
        indexNo: s.indexNo || '',

        level: s.level || 'Year 1'
      }));
      setStudents(sanitizedData);
    } catch (err) {
      setError('Failed to fetch candidates');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'Add' | 'Edit'>('Add');
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);

  // Promotion State
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState('Year 2');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Bulk Upload State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Student>>({
    indexNo: '',
    lastname: '',
    othernames: '',
    program: '',
    programId: undefined,
  });

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openAddModal = () => {
    setModalMode('Add');
    setFormData({ indexNo: '', lastname: '', othernames: '', program: '', programId: undefined });
    setIsModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setModalMode('Edit');
    setFormData({ ...student });
    setIsModalOpen(true);
  };

  const handleSaveCandidate = async () => {
    if (!formData.indexNo || !formData.lastname || !formData.program) return;

    try {
      if (modalMode === 'Add') {
        const payload = {
          indexNo: formData.indexNo,
          lastname: formData.lastname,
          othernames: formData.othernames || '',
          // program: formData.program, // Backend expects programId
          programId: formData.programId,
          // cohort: formData.cohort,
          // cohortId: formData.cohortId
        };
        await studentsService.create(payload as any);
      } else {
        const original = students.find(s => s.indexNo === formData.indexNo);
        if (original && original.id) {
          await studentsService.update(original.id, formData);
        }
      }
      await fetchStudents();
      setIsModalOpen(false);
      success('Candidate saved successfully!');
    } catch (err) {
      console.error(err);
      toastError('Failed to save candidate');
    }
  };

  const handleDeleteCandidate = async () => {
    if (deleteConfirmation) {
      try {
        const student = students.find(s => s.indexNo === deleteConfirmation);
        if (student && student.id) {
          await studentsService.delete(student.id);
          await fetchStudents();
          setDeleteConfirmation(null);
          success('Candidate deleted successfully!');
        }
      } catch (err) {
        console.error(err);
        toastError('Failed to delete candidate');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFile(e.target.files[0]);
    }
  };

  const [previewRows, setPreviewRows] = useState<any[] | null>(null);

  const parseRowsFromData = (rawRows: any[]) => {
    return rawRows.map(row => {
      const indexNo = String(row['Index No.'] || row['Index No'] || row['INDEX NO.'] || row['indexNo'] || '').trim();
      const lastname = String(row['Lastname'] || row['Last Name'] || row['LASTNAME'] || row['lastname'] || '').trim();
      const othernames = String(row['Othernames'] || row['Other Names'] || row['OTHERNAMES'] || row['othernames'] || '').trim();
      const programName = String(row['Program'] || row['PROGRAM'] || row['program'] || '').trim();

      const errors: string[] = [];
      if (!indexNo) errors.push('❌ Index No. is blank');
      if (!lastname) errors.push('❌ Lastname is blank');
      if (!programName) errors.push('❌ Program is blank');

      let programId: number | undefined;
      if (programName) {
        // Priority 1: exact name match (case-insensitive)
        let matchedProgram = programs.find(p =>
          p.name.toLowerCase() === programName.toLowerCase()
        );
        // Priority 2: match by short name or code
        if (!matchedProgram) {
          matchedProgram = programs.find(p =>
            (p.shortName && p.shortName.toLowerCase() === programName.toLowerCase()) ||
            (p.code && p.code.toLowerCase() === programName.toLowerCase())
          );
        }
        // Priority 3: fuzzy — only if still no match (risky, but better than nothing)
        if (!matchedProgram) {
          matchedProgram = programs.find(p =>
            p.name.toLowerCase().includes(programName.toLowerCase())
          );
        }
        if (matchedProgram) {
          programId = matchedProgram.id;
        } else {
          errors.push(`❌ Program "${programName}" not found in system`);
        }
      }

      return { indexNo, lastname, othernames, programName, programId, isValid: errors.length === 0, errors };
    });
  };

  const handleBulkUploadClick = () => {
    if (!uploadFile) {
      toastError('Please select a file first');
      return;
    }

    setIsUploading(true);
    const ext = uploadFile.name.split('.').pop()?.toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      // Use SheetJS for Excel files — PapaParse can only handle CSV
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          setPreviewRows(parseRowsFromData(rawRows));
        } catch (err) {
          toastError('Could not read Excel file. Make sure it is a valid .xlsx file.');
        } finally {
          setIsUploading(false);
        }
      };
      reader.onerror = () => { setIsUploading(false); toastError('Failed to read file.'); };
      reader.readAsArrayBuffer(uploadFile);
    } else {
      // CSV via PapaParse
      Papa.parse<any>(uploadFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            setPreviewRows(parseRowsFromData(results.data));
          } catch {
            toastError('Error validating file format');
          } finally {
            setIsUploading(false);
          }
        },
        error: (err) => { setIsUploading(false); toastError(`Error parsing CSV: ${err.message}`); }
      });
    }
  };

  const confirmImport = async () => {
    if (!previewRows) return;
    setIsUploading(true);

    const validRows = previewRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      toastError('No valid rows to import.');
      setIsUploading(false);
      return;
    }

    try {
      const payload = validRows.map(row => ({
        indexNo: row.indexNo,
        lastname: row.lastname,
        othernames: row.othernames,
        programId: row.programId
      }));

      const count = await studentsService.bulkCreate(payload as any);

      setIsUploading(false);
      setPreviewRows(null);
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (count > 0) {
        success(`Successfully imported ${count} candidate${count === 1 ? '' : 's'}. ${validRows.length - count > 0 ? `${validRows.length - count} skipped (duplicates).` : ''}`);
        fetchStudents();
      } else {
        toastError('No candidates were imported. All rows may already exist.');
      }
    } catch (err: any) {
      setIsUploading(false);
      toastError(err.response?.data?.error || 'Failed to import candidates. Please check the file and try again.');
    }
  };

  const handleSearch = () => {
    setAppliedSearchQuery(searchQuery);
    setPage(1);
  };

  // Update fetchStudents to use appliedSearchQuery and selectedProgramId
  useEffect(() => {
    fetchStudents();
  }, [page, limit, appliedSearchQuery, selectedProgramId]);

  const filteredStudents = students; // The API already filters now.

  // Selection Logic
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredStudents.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handlePromoteStudents = async () => {
    try {
      await studentsService.promote(selectedIds, selectedLevel);
      success(`Successfully promoted ${selectedIds.length} students to ${selectedLevel}`);
      await fetchStudents();
      setIsPromoteModalOpen(false);
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      toastError('Failed to promote students');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const count = await studentsService.bulkDelete(selectedIds);
      success(`Successfully deleted ${count} candidate${count === 1 ? '' : 's'}.`);
      setSelectedIds([]);
      setIsBulkDeleteConfirmOpen(false);
      await fetchStudents();
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to delete candidates. Some may have linked results.');
      setIsBulkDeleteConfirmOpen(false);
    }
  };

  const fetchAllMatchingStudents = async () => {
    try {
      // Fetch a massive page limit to simulate "all" for the current filter
      const resp = await studentsService.getAll({ page: 1, limit: 100000, search: appliedSearchQuery, programId: selectedProgramId });
      return resp.students.map((s: any) => ({
        ...s,
        program: s.program?.name || s.program || 'Unknown',
        lastname: s.lastname || '',
        othernames: s.othernames || '',
        indexNo: s.indexNo || ''
      }));
    } catch {
      toastError('Failed to fetch full data for export');
      return [];
    }
  };

  // Export Handlers
  const handleExportExcel = async () => {
    const data = await fetchAllMatchingStudents();
    const dataToExport = data.map(s => ({
      'Index No': s.indexNo,
      'Last Name': s.lastname,
      'Other Names': s.othernames,
      'Program': s.program
    }));
    exportToExcel(dataToExport, 'Candidates_List');
  };

  const handleExportPDF = async () => {
    const data = await fetchAllMatchingStudents();
    const columns = ['Index No', 'Last Name', 'Other Names', 'Program'];
    const formattedData = data.map(s => [s.indexNo, s.lastname, s.othernames, s.program]);
    exportToPDF(columns, formattedData, 'Candidates List');
  };

  const handlePrint = async () => {
    const data = await fetchAllMatchingStudents();
    const columns = ['Index No', 'Last Name', 'Other Names', 'Program'];
    const dataToExport = data.map(s => ({
      'Index No': s.indexNo,
      'Last Name': s.lastname,
      'Other Names': s.othernames,
      'Program': s.program
    }));
    printTable('Candidates List', columns, dataToExport);
  };

  const handleCopy = async () => {
    const data = await fetchAllMatchingStudents();
    const dataToCopy = data.map(s => ({
      'Index No': s.indexNo,
      'Last Name': s.lastname,
      'Other Names': s.othernames,
      'Program': s.program,
      'Level': s.level
    }));
    copyToClipboard(dataToCopy);
    success('Copied to clipboard!');
  };

  const handleDownloadTemplate = () => {
    const programNames = programs.map((p: any) => p.name);
    downloadCandidatesTemplate(programNames);
  };

  const isAdmin = user?.role === 'ADMINISTRATOR' || user?.role === 'Administrator';

  return (
    <div className="space-y-6">


      {/* Bulk Import Modal */}
      {isAdmin && isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-indigo-500" />
                Import Candidates
              </h3>
              <button
                onClick={() => { setIsBulkModalOpen(false); setUploadFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Download Template */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-indigo-800">New here? Download the sample form first.</p>
                  <p className="text-xs text-indigo-600 mt-0.5">Includes example rows, instructions, and all required formats.</p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="shrink-0 flex items-center gap-1.5 text-xs text-white font-semibold bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>

              {/* File Picker */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Select your completed file</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-indigo-400 hover:bg-indigo-50/20 transition-all group"
                >
                  <FileSpreadsheet className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 shrink-0" />
                  <span className="truncate text-left flex-1">
                    {uploadFile
                      ? <><span className="font-semibold text-gray-800">{uploadFile.name}</span> <span className="text-gray-400">({(uploadFile.size / 1024).toFixed(1)} KB)</span></>
                      : 'Choose .csv or .xlsx file…'}
                  </span>
                  {uploadFile && (
                    <span
                      onClick={(e) => { e.stopPropagation(); setUploadFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="ml-auto shrink-0 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </span>
                  )}
                </button>
                <p className="text-[11px] text-gray-400 mt-2">
                  Required columns: <code className="bg-gray-100 px-1 rounded">Index No.</code> · <code className="bg-gray-100 px-1 rounded">Lastname</code> · <code className="bg-gray-100 px-1 rounded">Othernames</code> · <code className="bg-gray-100 px-1 rounded">Program</code>
                </p>
              </div>

              {/* Action */}
              <button
                onClick={handleBulkUploadClick}
                disabled={!uploadFile || isUploading}
                className="w-full py-3 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
              >
                {isUploading
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analysing file…</>
                  : <><UploadCloud className="w-4 h-4" /> Preview & Validate</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidates List Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-4">
            <h2 className="text-[#3b5998] font-bold text-sm flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-gray-500" />
              Students Data Exporting
            </h2>
            {selectedIds.length > 0 && isAdmin && (
              <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 animate-fadeIn">
                <span className="text-xs font-bold text-blue-700">{selectedIds.length} Selected</span>
                <button
                  onClick={() => setIsPromoteModalOpen(true)}
                  className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                >
                  <ArrowUpCircle className="w-3 h-3" /> Promote
                </button>
                <button
                  onClick={() => setIsBulkDeleteConfirmOpen(true)}
                  className="text-xs bg-red-500 text-white px-2 py-0.5 rounded hover:bg-red-600 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            )}
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsBulkModalOpen(true)}
                className="border border-indigo-300 text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <UploadCloud className="w-3.5 h-3.5" /> Import
              </button>
              <button
                onClick={openAddModal}
                className="bg-[#FF5722] hover:bg-[#F4511E] text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-2 shadow-sm transition-colors uppercase"
              >
                <Plus className="w-4 h-4" /> Add Candidate
              </button>
            </div>
          )}
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex w-full sm:w-auto overflow-x-auto border border-blue-500 rounded shadow-sm">
              <button onClick={handleCopy} className="whitespace-nowrap flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-semibold text-blue-600 bg-white hover:bg-blue-50 border-r border-blue-200 transition-colors">COPY</button>
              <button onClick={handleExportExcel} className="whitespace-nowrap flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-semibold text-blue-600 bg-white hover:bg-blue-50 border-r border-blue-200 transition-colors">EXCEL</button>
              <button onClick={handleExportPDF} className="whitespace-nowrap flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-semibold text-blue-600 bg-white hover:bg-blue-50 border-r border-blue-200 transition-colors">PDF</button>
              <button onClick={handlePrint} className="whitespace-nowrap flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-semibold text-blue-600 bg-white hover:bg-blue-50 transition-colors">PRINT</button>
            </div>

            <div className="flex flex-col xl:flex-row items-start xl:items-center gap-3 w-full md:w-auto">
              <span className="text-gray-600 text-sm font-medium whitespace-nowrap hidden xl:block">FILTER:</span>

              <select
                value={selectedProgramId || ''}
                onChange={(e) => { setSelectedProgramId(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 bg-white w-full sm:w-auto min-w-[180px]"
              >
                <option value="">All Programs</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <div className="flex w-full sm:w-auto gap-2">
                <div className="relative w-full sm:w-auto">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Name or Index No."
                    className="border border-gray-300 rounded pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 w-full sm:w-56"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                </div>
                <button
                  onClick={handleSearch}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-bold transition-colors shadow-sm"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                {isAdmin && (
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={filteredStudents.length > 0 && selectedIds.length === filteredStudents.length}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                )}
                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase w-12">S/N</th>
                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">INDEX NO.</th>
                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">LASTNAME</th>
                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">OTHERNAMES</th>
                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">PROGRAM</th>
                {/* <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">LEVEL</th> */}
                {/* <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">COHORT</th> */}
                {isAdmin && <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-center w-32">ACTIONS</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-gray-500 animate-pulse">Loading candidates...</td>
                </tr>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((student, index) => (
                  <tr key={student.indexNo} className={`hover:bg-gray-50 group transition-colors ${selectedIds.includes(student.id) ? 'bg-blue-50/30' : ''}`}>
                    {isAdmin && (
                      <td className="py-4 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(student.id)}
                          onChange={() => handleSelectOne(student.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                    )}
                    <td className="py-4 px-4 text-sm text-gray-600">{index + 1}</td>
                    <td className="py-4 px-4 text-sm text-gray-800 font-mono font-medium">{student.indexNo}</td>
                    <td className="py-4 px-4 text-sm text-gray-800 font-semibold">{student.lastname}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{student.othernames}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{student.program}</td>
                    {/* <td className="py-4 px-4 text-sm text-gray-600">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${student.level === 'Year 3' ? 'bg-green-100 text-green-700' :
                          student.level === 'Year 2' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                          {student.level}
                        </span>
                      </td> */}
                    {/* <td className="py-4 px-4 text-sm text-gray-600">{student.cohort}</td> */}
                    {/* <td className="py-4 px-4 text-sm text-gray-600">{student.cohort}</td> */}
                    {isAdmin && (
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(student)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded border border-transparent hover:border-blue-100 transition-colors"
                            title="Edit Candidate"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmation(student.indexNo)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-100 transition-colors"
                            title="Delete Candidate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-gray-500 italic bg-gray-50/30">
                    No candidates found matching "{searchQuery}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50/50">
          <div className="text-sm text-gray-600">
            Showing <span className="font-bold">{(page - 1) * limit + 1}</span> to <span className="font-bold">{Math.min(page * limit, totalStudents)}</span> of <span className="font-bold">{totalStudents}</span> candidates
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm font-medium hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Logic to show generic page numbers nicely
                let p = i + 1;
                if (totalPages > 5 && page > 3) {
                  p = page - 2 + i;
                }
                if (p > totalPages) return null;

                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded text-sm font-medium transition-colors ${page === p ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm font-medium hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteConfirmation}
        title="Delete Candidate"
        message={`Are you sure you want to delete the candidate with Index No: ${deleteConfirmation}?`}
        confirmText="Delete"
        type="danger"
        onConfirm={handleDeleteCandidate}
        onCancel={() => setDeleteConfirmation(null)}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isBulkDeleteConfirmOpen}
        title={`Delete ${selectedIds.length} Candidate${selectedIds.length === 1 ? '' : 's'}`}
        message={`Are you sure you want to permanently delete ${selectedIds.length} selected candidate${selectedIds.length === 1 ? '' : 's'}? This cannot be undone and will also remove all associated results.`}
        confirmText={`Delete ${selectedIds.length} Candidate${selectedIds.length === 1 ? '' : 's'}`}
        type="danger"
        onConfirm={handleBulkDelete}
        onCancel={() => setIsBulkDeleteConfirmOpen(false)}
      />

      {/* Promote Students Modal */}
      {isPromoteModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl p-6 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-blue-600" />
                Promote Students
              </h3>
              <button onClick={() => setIsPromoteModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              You are about to promote <span className="font-bold text-gray-900">{selectedIds.length}</span> selected students.
              Their level will be updated to the selected year, but their past results will remain linked to their previous level.
            </p>

            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Promote To Level</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
              >
                {levelOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsPromoteModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePromoteStudents}
                className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-bold shadow-sm hover:bg-blue-700 flex items-center gap-2 transition-colors"
              >
                Promote Students
              </button>
            </div>
          </div>
        </div>
      )
      }

      {/* Add/Edit Candidate Modal */}
      {
        isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-lg shadow-xl relative flex flex-col animate-[fadeIn_0.2s_ease-out]">

              <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  {modalMode === 'Add' ? <Plus className="w-5 h-5 text-blue-600" /> : <Edit className="w-5 h-5 text-blue-600" />}
                  {modalMode} Candidate
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Index Number</label>
                  <input
                    name="indexNo"
                    value={formData.indexNo}
                    onChange={handleInputChange}
                    type="text"
                    placeholder="e.g. 131012059"
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Last Name</label>
                    <input
                      name="lastname"
                      value={formData.lastname}
                      onChange={handleInputChange}
                      type="text"
                      placeholder="e.g. Armah"
                      className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Other Names</label>
                    <input
                      name="othernames"
                      value={formData.othernames}
                      onChange={handleInputChange}
                      type="text"
                      placeholder="e.g. Diana Naa Ayeley"
                      className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Program</label>
                  <select
                    name="program"
                    value={formData.programId || ''}
                    onChange={(e) => {
                      const selectedId = Number(e.target.value);
                      const selectedProgram = programs.find((p: any) => p.id === selectedId);
                      setFormData({
                        ...formData,
                        programId: selectedId,
                        program: selectedProgram?.name || ''
                      });
                    }}
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="">Select Program</option>
                    {programs.map((prog: any) => (
                      <option key={prog.id} value={prog.id}>{prog.name}</option>
                    ))}
                  </select>
                </div>

                {/* Cohort Select Removed */}
                {/* <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cohort</label>
                <select
                  name="cohortId"
                  value={formData.cohortId || ''}
                  onChange={(e) => {
                    const selectedId = Number(e.target.value);
                    const selectedName = availableCohorts.find(c => c.id === selectedId)?.name || '';
                    setFormData({ ...formData, cohortId: selectedId, cohort: selectedName });
                  }}
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">Select Cohort</option>
                  {availableCohorts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div> */}
              </div>

              <div className="p-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCandidate}
                  className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-bold shadow-sm hover:bg-blue-700 flex items-center gap-2 transition-colors"
                >
                  <Save className="w-4 h-4" /> Save Candidate
                </button>
              </div>
            </div>
          </div>
        )}

      <ImportPreviewModal
        isOpen={!!previewRows}
        rows={previewRows || []}
        onConfirm={confirmImport}
        onCancel={() => setPreviewRows(null)}
        isSubmitting={isUploading}
      />
    </div>
  );
};

export default Candidates;