export function logInfo(event: string, data: Record<string, unknown> = {}) {
  console.info(
    JSON.stringify({
      level: 'info',
      event,
      ...data,
    }),
  );
}

export function logWarn(event: string, data: Record<string, unknown> = {}) {
  console.warn(
    JSON.stringify({
      level: 'warn',
      event,
      ...data,
    }),
  );
}

export function logError(
  event: string,
  error: unknown,
  data: Record<string, unknown> = {},
) {
  console.error(
    JSON.stringify({
      level: 'error',
      event,
      ...data,
      error: serializeError(error),
    }),
  );
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: typeof error === 'string' ? error : JSON.stringify(error),
  };
}
