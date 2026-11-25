import { describe, expect, it, vi } from 'vitest';
import { dualOboScopes, exchangeDualObo, type TokenExchanger } from '../src/lib/dual-obo.js';

function exchanger(impl: TokenExchanger['exchangeToken']): TokenExchanger {
  return { exchangeToken: vi.fn(impl) };
}

describe('exchangeDualObo', () => {
  const scopes = dualOboScopes('https://graph.microsoft.com', 'read-app');

  it('names the three scopes from the Graph resource and the read app id', () => {
    expect(scopes).toEqual({
      filesReadAll: 'https://graph.microsoft.com/Files.Read.All',
      readApi: 'api://read-app/access_as_user',
      selectedFiles: 'https://graph.microsoft.com/Files.SelectedOperations.Selected',
    });
  });

  it('exchanges only the search token when no read app is configured', async () => {
    const search = exchanger(async () => 'search-token');
    const result = await exchangeDualObo(search, null, 'assertion', scopes);

    expect(result).toEqual({ accessToken: 'search-token' });
    expect(search.exchangeToken).toHaveBeenCalledTimes(1);
    expect(search.exchangeToken).toHaveBeenCalledWith('assertion');
  });

  it('exchanges the assertion for Files.Read.All and for the read app, then for the selected scope', async () => {
    const search = exchanger(async (_assertion, requested) =>
      requested?.[0] === scopes.filesReadAll ? 'search-token' : 'read-assertion'
    );
    const read = exchanger(async () => 'selected-token');

    const result = await exchangeDualObo(search, read, 'user-assertion', scopes);

    expect(result).toEqual({ accessToken: 'search-token', selectedFilesToken: 'selected-token' });
    expect(search.exchangeToken).toHaveBeenNthCalledWith(1, 'user-assertion', [
      scopes.filesReadAll,
    ]);
    expect(search.exchangeToken).toHaveBeenNthCalledWith(2, 'user-assertion', [scopes.readApi]);
    expect(read.exchangeToken).toHaveBeenCalledWith('read-assertion', [scopes.selectedFiles]);
  });

  it('keeps the search token when the read exchange fails', async () => {
    const search = exchanger(async () => 'search-token');
    const read = exchanger(async () => {
      throw new Error('consent_required');
    });

    const result = await exchangeDualObo(search, read, 'user-assertion', scopes);

    expect(result.accessToken).toBe('search-token');
    expect(result.selectedFilesToken).toBeUndefined();
    expect(result.selectedFilesError).toMatch(/consent_required/);
  });

  it('does not swallow a failure of the search exchange', async () => {
    const search = exchanger(async () => {
      throw new Error('invalid_grant');
    });
    const read = exchanger(async () => 'selected-token');

    await expect(exchangeDualObo(search, read, 'user-assertion', scopes)).rejects.toThrow(
      'invalid_grant'
    );
    expect(read.exchangeToken).not.toHaveBeenCalled();
  });
});
