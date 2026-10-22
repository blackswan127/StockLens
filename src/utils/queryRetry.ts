interface ErrorWithResponse {
  response?: {
    status?: number;
  };
}

export type QueryRetryPolicy = ((failureCount: number, error: unknown) => boolean) & {
  retryDelay: (failureCount: number) => number;
};

export function createQueryRetryPolicy(baseDelay = 1000): QueryRetryPolicy {
  const retry = (failureCount: number, error: unknown): boolean => {
    const status = (error as ErrorWithResponse | null | undefined)?.response?.status;

    if (status === 404) {
      return false;
    }

    return failureCount < 2;
  };

  return Object.assign(retry, {
    retryDelay: (failureCount: number) => Math.min(baseDelay * 2 ** failureCount, 30_000),
  });
}
