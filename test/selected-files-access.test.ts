import { describe, expect, it } from 'vitest';
import { requestContext } from '../src/request-context.js';
import { selectedFilesAccess } from '../src/lib/selected-files-access.js';

describe('selectedFilesAccess', () => {
  it('leaves tools on the normal token when dual-app mode is off', () => {
    const access = requestContext.run({ accessToken: 'search' }, () =>
      selectedFilesAccess('list-folder-files')
    );
    expect(access).toEqual({});
  });

  it('returns the read token for the folder-scoped tools', () => {
    const access = requestContext.run(
      { accessToken: 'search', selectedFilesToken: 'selected' },
      () => selectedFilesAccess('get-drive-item')
    );
    expect(access).toEqual({ token: 'selected' });
  });

  it('does not give the read token to search-query', () => {
    const access = requestContext.run(
      { accessToken: 'search', selectedFilesToken: 'selected' },
      () => selectedFilesAccess('search-query')
    );
    expect(access).toEqual({});
  });

  it('refuses a folder-scoped tool when the read exchange failed', () => {
    const access = requestContext.run(
      { accessToken: 'search', selectedFilesError: 'exchange failed' },
      () => selectedFilesAccess('download-bytes')
    );
    expect(access).toEqual({ error: 'exchange failed' });
  });

  it('covers get-download-url', () => {
    const access = requestContext.run(
      { accessToken: 'search', selectedFilesToken: 'selected' },
      () => selectedFilesAccess('get-download-url')
    );
    expect(access).toEqual({ token: 'selected' });
  });
});
