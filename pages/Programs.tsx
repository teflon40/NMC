import React, { useState, useEffect } from 'react';
import { Program } from '../types';
import { programsService } from '../src/services/programs.service';
import { assessmentTypesService, AssessmentType } from '../src/services/assessmentTypes.service';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useToast } from '../src/context/ToastContext';
import {
  Edit,
  Trash2,
  Power,
  Search,
  Plus,
  X,
  AlertTriangle,
  Save,
  CheckCircle2,
  XCircle,
  Loader2,
  Users
} from 'lucide-react';
import ConfirmationModal from '../src/components/ConfirmationModal';

const Programs: React.FC = () => {
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const { data: assessmentTypes = [] } = useQuery({
    queryKey: ['assessment-types'],
    queryFn: assessmentTypesService.getAll,
  });

  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'Add' | 'Edit'>('Add');
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | number | null>(null);
  // Track which item is being edited for updates
  const [editingId, setEditingId] = useState<string | number | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Program> & { assessmentTypeIds?: number[] }>({
    name: '',
    shortName: '',
    code: '',
    status: 'ACTIVE',
    maxTasks: 1,
    assessmentTypeIds: []
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
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      setIsLoading(true);
      const data = await programsService.getAll();
      setPrograms(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch programs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openAddModal = () => {
    setModalMode('Add');
    // Default to all selected for a new program
    setFormData({ name: '', shortName: '', code: '', status: 'ACTIVE', maxTasks: 1, maxCarePlans: 1, assessmentTypeIds: assessmentTypes.map(a => a.id) });
    setIsModalOpen(true);
  };

  const openEditModal = (program: Program) => {
    setModalMode('Edit');
    setEditingId(program.id);
    const existingIds = program.assessmentTypeLinks?.map((link: any) => link.assessmentType?.id || link.assessmentTypeId) || [];
    setFormData({ ...program, assessmentTypeIds: existingIds });
    setIsModalOpen(true);
  };

  const toggleAssessment = (id: number) => {
    setFormData(prev => {
      const current = prev.assessmentTypeIds || [];
      const next = current.includes(id)
        ? current.filter(x => x !== id)
        : [...current, id];
      // If unchecking the Care Plan type, reset maxCarePlans to 0
      const toggledType = assessmentTypes.find((t: AssessmentType) => t.id === id);
      const isCarePlan = toggledType?.code === 'CARE_PLAN';
      const wasSelected = current.includes(id);
      return {
        ...prev,
        assessmentTypeIds: next,
        ...(isCarePlan && wasSelected ? { maxCarePlans: 0 } : {}),
      };
    });
  };

  const handleSaveProgram = async () => {
    if (!formData.name || !formData.code) return;
    if (isSaving) return; // Prevent double-save
    setIsSaving(true);

    try {
      if (modalMode === 'Add') {
        await programsService.create(formData);
      } else if (editingId) {
        await programsService.update(editingId, formData);
      }
      await fetchPrograms();
      setIsModalOpen(false);
      success('Program saved successfully!');
    } catch (err: any) {
      console.error(err);
      toastError(err?.response?.data?.error || 'Failed to save program');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProgram = async () => {
    if (deleteConfirmation) {
      try {
        await programsService.delete(deleteConfirmation);
        await fetchPrograms();
        setDeleteConfirmation(null);
        success('Program deleted successfully!');
      } catch (err) {
        console.error(err);
        toastError('Failed to delete program');
      }
    }
  };

  const handleToggleStatus = async (program: Program) => {
    try {
      const newStatus = program.status === 'ACTIVE' ? 'DORMANT' : 'ACTIVE';
      await programsService.update(program.id, { status: newStatus });
      await fetchPrograms(); // Refetch to ensure consistency
      success('Status updated successfully');
    } catch (err) {
      console.error(err);
      toastError('Failed to update status');
    }
  };


  // Filter Logic
  const filteredPrograms = programs.filter(prog =>
    prog.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prog.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prog.shortName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 relative">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-gray-700 font-bold flex items-center gap-2">
            Programs Management
          </h2>
          <button
            onClick={openAddModal}
            className="bg-[#FF5722] hover:bg-[#F4511E] text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-2 shadow-sm transition-colors uppercase"
          >
            <Plus className="w-4 h-4" /> Add Program
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex gap-0 border border-blue-500 rounded overflow-hidden">
              <button className="px-4 py-1.5 text-sm font-semibold text-blue-600 bg-white hover:bg-blue-50 border-r border-blue-200">COPY</button>
              <button className="px-4 py-1.5 text-sm font-semibold text-blue-600 bg-white hover:bg-blue-50 border-r border-blue-200">EXCEL</button>
              <button className="px-4 py-1.5 text-sm font-semibold text-blue-600 bg-white hover:bg-blue-50 border-r border-blue-200">PDF</button>
              <button className="px-4 py-1.5 text-sm font-semibold text-blue-600 bg-white hover:bg-blue-50">PRINT</button>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-gray-600 text-sm font-medium">SEARCH:</span>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Name, Code, or Shortname"
                  className="border border-gray-300 rounded pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 w-full md:w-64"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-16">S/N</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">NAME</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-32">SHORT NAME</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-32">ID / CODE</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-32">STATUS</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-40">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPrograms.map((prog, index) => (
                  <tr key={prog.id} className="hover:bg-gray-50 group transition-colors">
                    <td className="py-4 px-4 text-sm text-gray-600 font-medium">{index + 1}</td>
                    <td className="py-4 px-4 text-sm text-gray-800 font-semibold">{prog.name}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{prog.shortName}</td>
                    <td className="py-4 px-4 text-sm text-gray-600 font-mono">{prog.code}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${prog.status === 'ACTIVE'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                        {prog.status === 'ACTIVE' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {prog.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(prog)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded border border-transparent hover:border-blue-100 transition-colors"
                          title="Edit Program"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(prog)}
                          className={`p-1.5 rounded border border-transparent transition-colors ${prog.status === 'ACTIVE'
                            ? 'text-orange-500 hover:bg-orange-50 hover:border-orange-100'
                            : 'text-green-600 hover:bg-green-50 hover:border-green-100'
                            }`}
                          title={prog.status === 'ACTIVE' ? 'Make Dormant' : 'Activate'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmation(prog.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-100 transition-colors"
                          title="Delete Program"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPrograms.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500 italic bg-gray-50/30">
                      No programs found matching "{searchQuery}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-lg shadow-xl p-6 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Program</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Are you sure you want to delete this program? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={() => setDeleteConfirmation(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProgram}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Program Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl relative flex flex-col max-h-[90vh] animate-[fadeIn_0.2s_ease-out]">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                {modalMode === 'Add' ? <Plus className="w-5 h-5 text-blue-600" /> : <Edit className="w-5 h-5 text-blue-600" />}
                {modalMode} Program
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Program Name</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  type="text"
                  placeholder="e.g. Registered General Nursing"
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="flex gap-4 flex-col sm:flex-row">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Short Name</label>
                  <input
                    name="shortName"
                    value={formData.shortName}
                    onChange={handleInputChange}
                    type="text"
                    placeholder="e.g. RGN"
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500 uppercase transition-colors"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Program Code / ID</label>
                  <input
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    type="text"
                    placeholder="e.g. 10052"
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-4 flex-col sm:flex-row">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Max Tasks Allowed</label>
                  <input
                    name="maxTasks"
                    value={formData.maxTasks}
                    onChange={handleInputChange}
                    type="number"
                    min="1"
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                {(() => {
                  const carePlanType = (assessmentTypes as AssessmentType[]).find(t => t.code === 'CARE_PLAN');
                  const carePlanSelected = carePlanType && formData.assessmentTypeIds?.includes(carePlanType.id);
                  return carePlanSelected ? (
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Max Care Plans Allowed</label>
                      <input
                        name="maxCarePlans"
                        value={formData.maxCarePlans || 1}
                        onChange={handleInputChange}
                        type="number"
                        min="1"
                        max="3"
                        className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  ) : null;
                })()}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Status</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="ACTIVE"
                      checked={formData.status === 'ACTIVE'}
                      onChange={handleInputChange}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="DORMANT"
                      checked={formData.status === 'DORMANT'}
                      onChange={handleInputChange}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Dormant</span>
                  </label>
                </div>
              </div>

              {/* Assessment Types Checkboxes */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Eligible Assessments</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {assessmentTypes.map((type) => (
                    <label key={type.id} className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${formData.assessmentTypeIds?.includes(type.id) ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                      <input
                        type="checkbox"
                        checked={formData.assessmentTypeIds?.includes(type.id)}
                        onChange={() => toggleAssessment(type.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 font-medium">{type.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProgram}
                disabled={isSaving}
                className={`px-6 py-2 rounded text-sm font-bold shadow-sm flex items-center gap-2 transition-colors ${isSaving
                    ? 'bg-blue-400 text-white cursor-not-allowed opacity-70'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
              >
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4" /> Save Program</>
                )}
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

export default Programs;