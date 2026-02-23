export interface Program {
  id: string | number;
  sn: number;
  name: string;
  shortName: string;
  code: string;
  status: 'ACTIVE' | 'DORMANT';
  maxTasks?: number;
  assessmentTypeLinks?: { assessmentType: { id: number, code: string, name: string } }[];
}

export interface Student {
  sn: number;
  indexNo: string;
  lastname: string;
  othernames: string;
  program: string;
  level: string;
  programId?: number;
}

export interface Examiner {
  id: string;
  sn: number;
  name: string;
  email: string;
  phone: string;
  program: string;
  status: 'Active' | 'Inactive';
}

export interface User {
  id?: number;
  name: string;
  username: string;
  email: string;
  role: 'Administrator' | 'Examiner' | 'ADMINISTRATOR' | 'EXAMINER';
  password?: string; // Added password field
  forcePasswordChange?: boolean;
}

export interface TaskResult {
  indexNo: string;
  name: string;
  taskCategory: string;
  task: string;
}

export interface Procedure {
  id: string;
  step: number;
  description: string;
  maxMarks: number;
}

export interface TaskDefinition {
  id: string;
  program: string;
  category: string;
  title: string;
  procedures: Procedure[];
}

// Result Types
export interface PracticalResult {
  indexNo: string;
  name: string;
  program: string;
  totalTasks: number;
  score: number;
}

export interface CareStudyResult {
  indexNo: string;
  name: string;
  program: string;
  caseTitle: string;
  score: number;
}

export interface CarePlanResult {
  indexNo: string;
  name: string;
  program: string;
  diagnosis: string;
  score: number;
}

export interface ObstetricianResult {
  indexNo: string;
  name: string;
  program: string;
  procedure: string;
  score: number;
}