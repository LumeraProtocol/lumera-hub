import { beforeEach, describe, expect, it, vi } from 'vitest';

import { showGlobalApiErrorToast, GLOBAL_API_ERROR_TOAST_ID } from './global-api-error';

const makeToastApi = (active = false) => ({
  isActive: vi.fn().mockReturnValue(active),
  update: vi.fn(),
  error: vi.fn(),
});

describe('showGlobalApiErrorToast', () => {
  let toastApi: ReturnType<typeof makeToastApi>;

  beforeEach(() => {
    toastApi = makeToastApi();
  });

  it('shows the API error message as a toast', () => {
    showGlobalApiErrorToast('Rate limit exceeded. Try again in 1 minutes.', toastApi);

    expect(toastApi.error).toHaveBeenCalledWith(
      'Rate limit exceeded. Try again in 1 minutes.',
      { toastId: GLOBAL_API_ERROR_TOAST_ID },
    );
  });

  it('shows nothing when the error state was cleared', () => {
    showGlobalApiErrorToast(null, toastApi);

    expect(toastApi.error).not.toHaveBeenCalled();
    expect(toastApi.update).not.toHaveBeenCalled();
  });

  it('falls back to a generic message when the response carried no text', () => {
    // HTTP/2 responses have an empty statusText, so an error can arrive with
    // an empty message. It must still be surfaced.
    showGlobalApiErrorToast('', toastApi);

    expect(toastApi.error).toHaveBeenCalledWith(
      'Failed to fetch',
      { toastId: GLOBAL_API_ERROR_TOAST_ID },
    );
  });

  it('replaces the sentinel produced for requests that never got a response', () => {
    showGlobalApiErrorToast('unknown error', toastApi);

    expect(toastApi.error).toHaveBeenCalledWith(
      'Failed to fetch',
      { toastId: GLOBAL_API_ERROR_TOAST_ID },
    );
  });

  it('updates the visible toast instead of dropping a newer, different error', () => {
    const activeToastApi = makeToastApi(true);

    showGlobalApiErrorToast('Internal server error', activeToastApi);

    expect(activeToastApi.update).toHaveBeenCalledWith(
      GLOBAL_API_ERROR_TOAST_ID,
      expect.objectContaining({ render: 'Internal server error' }),
    );
    expect(activeToastApi.error).not.toHaveBeenCalled();
  });
});
