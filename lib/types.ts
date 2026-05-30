export type UserRole = 'organizer' | 'organization' | null;

export interface Organizer {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  contact_person: string;
  contact_email: string;
  phone: string;
  user_id: string | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  organizer_id: string;
  name: string;
  description: string;
  deadline: string;
  status: 'draft' | 'active' | 'closed';
  is_template: boolean;
  template_name: string;
  share_token: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignFileRequirement {
  id: string;
  campaign_id: string;
  name: string;
  accepted_formats: string[];
  max_size_mb: number;
  is_required: boolean;
  sort_order: number;
  created_at: string;
}

export interface Submission {
  id: string;
  campaign_id: string;
  file_requirement_id: string;
  organization_id: string | null;
  submitted_by_name: string;
  submitted_by_email: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string;
  created_at: string;
  updated_at: string;
  campaign_file_requirements?: CampaignFileRequirement;
  organizations?: Organization;
  campaigns?: Campaign;
}

export interface Notification {
  id: string;
  campaign_id: string;
  organization_id: string | null;
  recipient_email: string;
  type: 'reminder_7d' | 'reminder_3d' | 'reminder_1d' | 'file_received' | 'file_rejected' | 'campaign_closed';
  sent_at: string;
  created_at: string;
}

export interface FileRequirementInput {
  name: string;
  accepted_formats: string[];
  max_size_mb: number;
  is_required: boolean;
}

export const FORMAT_OPTIONS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'xls', label: 'Excel (.xls)' },
  { value: 'docx', label: 'Word (.docx)' },
  { value: 'doc', label: 'Word (.doc)' },
  { value: 'jpg', label: 'Image (JPG)' },
  { value: 'jpeg', label: 'Image (JPEG)' },
  { value: 'png', label: 'Image (PNG)' },
];

export const ACCEPTED_MIME_TYPES: Record<string, string[]> = {
  pdf: ['application/pdf'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  xls: ['application/vnd.ms-excel'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  doc: ['application/msword'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
};

export const FILE_EXTENSIONS: Record<string, string[]> = {
  pdf: ['.pdf'],
  xlsx: ['.xlsx'],
  xls: ['.xls'],
  docx: ['.docx'],
  doc: ['.doc'],
  jpg: ['.jpg', '.jpeg'],
  jpeg: ['.jpg', '.jpeg'],
  png: ['.png'],
};
