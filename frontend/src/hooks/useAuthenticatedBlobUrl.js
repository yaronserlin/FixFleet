// src/hooks/useAuthenticatedBlobUrl.js
import { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';

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
