import apiClient from './client';

export interface ApplicationHistoryItem {
  applicationId: number;
  requisitionId: number;
  positionTitle: string;
  requisitionCode: string;
  departmentName: string;
  stage: string;
  appliedAt: string | null;
  cvFileUrl: string | null;
  cvFileName: string | null;
  current: boolean;
  withdrawn: boolean;
}

export interface CandidateNote {
  id: number;
  applicationId: number;
  authorId: number;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string | null;
  canEdit: boolean;
  canDelete: boolean;
}

export interface CandidateTag {
  id: number;
  applicationId: number;
  tagName: string;
  createdByUserId: number | null;
  createdByName: string;
  createdAt: string;
}

export interface ProfilePermissions {
  canView: boolean;
  canEditStage: boolean;
  canManageTags: boolean;
  canAddNotes: boolean;
  canDeleteNotes: boolean;
  canViewCv: boolean;
  canUploadCv: boolean;
}

export interface CandidateUnifiedProfile {
  id: number;
  candidateUserId: number | null;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;

  currentRequisitionId: number;
  currentPositionTitle: string;
  currentRequisitionCode: string;
  currentDepartmentName: string;
  currentStage: string;
  appliedAt: string | null;
  coverLetter: string | null;
  withdrawn: boolean;
  withdrawnAt: string | null;
  withdrawalReason: string | null;
  rejectionReason: string | null;

  cvFileUrl: string | null;
  cvFileName: string | null;
  cvFileSize: number | null;
  cvContentType: string | null;

  applicationHistory: ApplicationHistoryItem[];
  tags: CandidateTag[];
  notes: CandidateNote[];
  permissions: ProfilePermissions;
}

export const candidateApi = {
  getUnifiedProfile: async (id: number): Promise<CandidateUnifiedProfile> => {
    const res = await apiClient.get<CandidateUnifiedProfile>(`/api/candidates/${id}/profile`);
    return res.data;
  },

  getCvBlob: async (id: number): Promise<{ blob: Blob; fileName: string }> => {
    const res = await apiClient.get(`/api/candidates/${id}/cv`, {
      responseType: 'blob',
    });
    // Trích xuất filename từ header nếu có
    const disposition = res.headers['content-disposition'] || '';
    let fileName = 'CV.pdf';
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      fileName = match[1];
    }
    return { blob: res.data, fileName };
  },

  uploadCv: async (id: number, file: File): Promise<CandidateUnifiedProfile> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<CandidateUnifiedProfile>(`/api/candidates/${id}/cv`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  addNote: async (id: number, content: string): Promise<CandidateNote> => {
    const res = await apiClient.post<CandidateNote>(`/api/candidates/${id}/notes`, { content });
    return res.data;
  },

  updateNote: async (id: number, noteId: number, content: string): Promise<CandidateNote> => {
    const res = await apiClient.put<CandidateNote>(`/api/candidates/${id}/notes/${noteId}`, { content });
    return res.data;
  },

  deleteNote: async (id: number, noteId: number): Promise<void> => {
    await apiClient.delete(`/api/candidates/${id}/notes/${noteId}`);
  },

  addTag: async (id: number, tagName: string): Promise<CandidateTag> => {
    const res = await apiClient.post<CandidateTag>(`/api/candidates/${id}/tags`, { tagName });
    return res.data;
  },

  deleteTag: async (id: number, tagId: number): Promise<void> => {
    await apiClient.delete(`/api/candidates/${id}/tags/${tagId}`);
  },
};

export default candidateApi;
