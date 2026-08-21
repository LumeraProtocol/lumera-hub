/**
 * Presents the redux error slice's current message as the single global API
 * error toast.
 *
 * - `null`/`undefined` means the error state was cleared: show nothing.
 * - An empty message still represents a real failure (HTTP/2 responses have
 *   an empty statusText), as does the literal 'unknown error' sentinel that
 *   utils/api.ts produces for requests that never got a response — both fall
 *   back to a generic text instead of being swallowed.
 * - While the toast is on screen a newer error updates it in place;
 *   re-raising with the same toastId would be silently ignored by
 *   react-toastify and the newer error would never be seen.
 */
export const GLOBAL_API_ERROR_TOAST_ID = 'global-api-error';

interface GlobalErrorToastApi {
  isActive: (toastId: string) => boolean;
  update: (toastId: string, options: { render: string; type: 'error' }) => void;
  error: (message: string, options: { toastId: string }) => void;
}

export const showGlobalApiErrorToast = (
  message: unknown,
  toastApi: GlobalErrorToastApi,
) => {
  if (message == null) return;
  const text = typeof message === 'string' ? message.trim() : '';
  const errorMessage = text && text !== 'unknown error' ? text : 'Failed to fetch';

  if (toastApi.isActive(GLOBAL_API_ERROR_TOAST_ID)) {
    toastApi.update(GLOBAL_API_ERROR_TOAST_ID, { render: errorMessage, type: 'error' });
    return;
  }
  toastApi.error(errorMessage, { toastId: GLOBAL_API_ERROR_TOAST_ID });
};
