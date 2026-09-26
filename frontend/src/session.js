const storageKey = 'technoland-session';
const nonceKey = 'technoland-login-nonce';

function endpoint(action) {
    const url = new URL(process.env.REACT_APP_PUBLIC_API_URL);
    url.searchParams.set('action', action);
    return url;
}

export function readSession() {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    try {
        if (fragment.has('session') || fragment.has('login_error')) {
            const nonce = sessionStorage.getItem(nonceKey);
            const session = fragment.get('session');
            if (nonce && fragment.get('nonce') === nonce && /^[a-f0-9]{64}$/.test(session || '')) {
                sessionStorage.setItem(storageKey, session);
            } else {
                sessionStorage.setItem('technoland-login-error', 'Spotify connection was cancelled or could not be completed. Please try again.');
            }
            sessionStorage.removeItem(nonceKey);
            const query = sessionStorage.getItem('technoland-display-query') || window.location.search;
            sessionStorage.removeItem('technoland-display-query');
            window.history.replaceState(null, '', window.location.pathname + query);
        }
        return sessionStorage.getItem(storageKey);
    } catch (error) {
        return null;
    }
}

export function connect() {
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    const nonce = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    try {
        sessionStorage.setItem(nonceKey, nonce);
        // Preserve display options across the round trip without allowing an arbitrary redirect.
        sessionStorage.setItem('technoland-display-query', window.location.search);
    } catch (error) {
        window.alert('Please enable browser session storage to connect Spotify.');
        return;
    }
    const url = endpoint('login');
    url.searchParams.set('return', window.location.origin + window.location.pathname);
    url.searchParams.set('nonce', nonce);
    window.location.assign(url.toString());
}

export async function disconnect(session) {
    try {
        const response = await fetch(endpoint('logout').toString(), {
            method: 'POST', credentials: 'omit', headers: { Authorization: `Bearer ${session}` }
        });
        if (!response.ok && response.status !== 401) throw new Error('Logout failed');
        sessionStorage.removeItem(storageKey);
        window.location.reload();
    } catch (error) {
        window.alert('Could not disconnect. Please try again.');
    }
}

export function playbackUrl(session) {
    if (process.env.REACT_APP_PUBLIC_API_URL) return endpoint(session ? 'playback' : 'owner').toString();
    return process.env.REACT_APP_API_URL;
}

export function readLoginError() {
    try {
        const message = sessionStorage.getItem('technoland-login-error');
        sessionStorage.removeItem('technoland-login-error');
        return message;
    } catch (error) {
        return null;
    }
}
