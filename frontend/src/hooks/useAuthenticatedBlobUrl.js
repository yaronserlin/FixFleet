// src/hooks/useAuthenticatedBlobUrl.js
import { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';

// True only for this app's or the API's own origin -- the only places the
// Bearer token may go.
function isTrustedOrigin(url) {
    const { origin } = window.location;
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const trusted = [origin];
    if (/^https?:\/\//.test(apiUrl)) trusted.push(new URL(apiUrl).origin);
    try {
        return trusted.includes(new URL(url, origin).origin);
    } catch {
        return false;
    }
}

/**
 * Fetches a protected media URL (e.g. `/uploads/:filename`, which requires a
 * valid auth token) as a blob and exposes it as a local object URL.
 *
 * `<img>`/`<object>`/`<iframe>`/`<a download>` elements can't attach an
 * `Authorization` header themselves, so they rely entirely on the `token`
 * cookie -- which is short-lived and only gets refreshed by `apiClient`'s
 * response interceptor when an *axios* request 401s. If nothing else has
 * called the API in a while, that cookie can quietly expire, and a raw
 * `<object data="...">`/`window.open(url)` then shows the backend's plain
 * `{"message":"..."}` 401 JSON body instead of the document/photo.
 *
 * Routing the fetch through `apiClient` instead gets the same Bearer token
 * + automatic 401-refresh-and-retry every other API call already gets.
 * `baseURL` is overridden to `''` per-request since media routes are
 * mounted outside the `/api` prefix `apiClient` otherwise defaults to.
 *
 * `apiClient` attaches the Bearer token to every request, so only URLs on
 * this app's or the API's own origin are fetched; anything else (e.g. an
 * external URL stored in an old fault) errors instead of leaking the token.
 *
 * @param {string} url - A fully-resolved media URL (see `getMediaUrl`), or falsy to skip fetching.
 * @returns {{ blobUrl: string|null, loading: boolean, error: Error|null }}
 */
export function useAuthenticatedBlobUrl(url) {
    const [state, setState] = useState({ blobUrl: null, loading: Boolean(url), error: null });

    useEffect(() => {
        if (!url) {
            setState({ blobUrl: null, loading: false, error: null });
            return undefined;
        }

        if (!isTrustedOrigin(url)) {
            setState({ blobUrl: null, loading: false, error: new Error('Refusing to fetch media from an untrusted origin') });
            return undefined;
        }

        let cancelled = false;
        let objectUrl = null;
        setState({ blobUrl: null, loading: true, error: null });

        apiClient
            .get(url, { baseURL: '', responseType: 'blob' })
            .then((res) => {
                if (cancelled) return;
                objectUrl = URL.createObjectURL(res.data);
                setState({ blobUrl: objectUrl, loading: false, error: null });
            })
            .catch((err) => {
                if (cancelled) return;
                setState({ blobUrl: null, loading: false, error: err });
            });

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [url]);

    return state;
}

export default useAuthenticatedBlobUrl;
