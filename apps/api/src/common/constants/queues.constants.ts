export const QUEUE_NAMES = {
  NOTIFICATION: 'notification',
  EMAIL: 'email',
  SLA_CHECK: 'sla-check',
  CLEANUP: 'cleanup',
} as const;

export const QUEUE_CONFIGS = {
  [QUEUE_NAMES.NOTIFICATION]: {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential' as const, delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  },
  [QUEUE_NAMES.EMAIL]: {
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential' as const, delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 1000,
    },
  },
  [QUEUE_NAMES.SLA_CHECK]: {
    defaultJobOptions: {
      attempts: 2,
      removeOnComplete: 50,
      removeOnFail: 200,
    },
  },
  [QUEUE_NAMES.CLEANUP]: {
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: 10,
      removeOnFail: 50,
    },
  },
} as const;
