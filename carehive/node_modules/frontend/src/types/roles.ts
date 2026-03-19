export type UserRole = 'patient' | 'clinician' | 'family';

export const ROLE_LABELS: Record<UserRole, string> = {
  patient: 'Patient',
  clinician: 'Clinician',
  family: 'Family Member',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  patient: 'Track medications, view insights, manage your health journey',
  clinician: 'Upload EHR, manage patient data, view clinical summaries',
  family: 'Monitor loved ones, receive alerts, stay informed',
};

export interface RolePermissions {
  canUploadEhr: boolean;
  canManagePatients: boolean;
  canTrackMedications: boolean;
  canViewInsights: boolean;
  canViewClinicalSummary: boolean;
  canMonitorFamily: boolean;
  canRunAgents: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  patient: {
    canUploadEhr: false,
    canManagePatients: false,
    canTrackMedications: true,
    canViewInsights: true,
    canViewClinicalSummary: false,
    canMonitorFamily: false,
    canRunAgents: false,
  },
  clinician: {
    canUploadEhr: true,
    canManagePatients: true,
    canTrackMedications: false,
    canViewInsights: true,
    canViewClinicalSummary: true,
    canMonitorFamily: false,
    canRunAgents: true,
  },
  family: {
    canUploadEhr: false,
    canManagePatients: false,
    canTrackMedications: false,
    canViewInsights: true,
    canViewClinicalSummary: false,
    canMonitorFamily: true,
    canRunAgents: false,
  },
};
