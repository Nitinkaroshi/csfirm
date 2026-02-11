export interface NotificationJobData {
  userId: string;
  firmId: string;
  title: string;
  body: string;
  eventName: string;
}

export interface EmailJobData {
  userId: string;
  firmId: string;
  title: string;
  body: string;
  eventName: string;
  to?: string;
}

export interface SlaCheckJobData {
  firmId?: string; // If empty, check all firms
}

export interface CleanupJobData {
  type: 'expired_sessions' | 'old_notifications' | 'audit_archive';
}
