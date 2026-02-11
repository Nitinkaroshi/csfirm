export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface JwtPayload {
  sub: string;
  firmId: string;
  userType: 'STAFF' | 'CLIENT';
  role: string;
  employeeId?: string;
  orgId?: string;
  tokenFamily: string;
}

export interface AuthenticatedUser {
  userId: string;
  id: string;
  firmId: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'STAFF' | 'CLIENT';
  staffRole?: string;
  employeeId?: string;
  orgId?: string;
  orgUserRole?: string;
}

export interface DomainEventPayload {
  eventName: string;
  firmId: string;
  actorId?: string;
  timestamp: Date;
  payload: Record<string, unknown>;
}
