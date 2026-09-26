import { readSession, readLoginError, playbackUrl } from './session';

const session = 'a'.repeat(64);
const nonce = 'b'.repeat(64);
const originalEndpoint = process.env.REACT_APP_PUBLIC_API_URL;

beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, '', '/');
});
afterEach(() => {
    if (originalEndpoint === undefined) delete process.env.REACT_APP_PUBLIC_API_URL;
    else process.env.REACT_APP_PUBLIC_API_URL = originalEndpoint;
});

test('accepts a callback only for the tab that initiated login and removes the fragment', () => {
    sessionStorage.setItem('technoland-login-nonce', nonce);
    sessionStorage.setItem('technoland-display-query', '?minimal=1');
    window.location.hash = `session=${session}&nonce=${nonce}`;
    expect(readSession()).toBe(session);
    expect(window.location.hash).toBe('');
    expect(window.location.search).toBe('?minimal=1');
    expect(sessionStorage.getItem('technoland-login-nonce')).toBe(null);
});

test('rejects unsolicited and mismatched login callbacks', () => {
    window.location.hash = `session=${session}&nonce=${nonce}`;
    expect(readSession()).toBe(null);
    sessionStorage.setItem('technoland-login-nonce', 'wrong');
    window.location.hash = `session=${session}&nonce=${nonce}`;
    expect(readSession()).toBe(null);
    expect(window.location.hash).toBe('');
});

test('rejects malformed sessions even with a matching nonce', () => {
    sessionStorage.setItem('technoland-login-nonce', nonce);
    window.location.hash = `session=invalid&nonce=${nonce}`;
    expect(readSession()).toBe(null);
});

test('uses distinct owner and visitor routes on the companion endpoint', () => {
    process.env.REACT_APP_PUBLIC_API_URL = 'https://example.com/companion/';
    expect(playbackUrl(null)).toBe('https://example.com/companion/?action=owner');
    expect(playbackUrl(session)).toBe('https://example.com/companion/?action=playback');
    delete process.env.REACT_APP_PUBLIC_API_URL;
    expect(playbackUrl(null)).toBe(process.env.REACT_APP_API_URL);
});

test('surfaces a declined login and consumes its error message', () => {
    sessionStorage.setItem('technoland-login-nonce', nonce);
    window.location.hash = `login_error=declined&nonce=${nonce}`;
    expect(readSession()).toBe(null);
    expect(readLoginError()).toContain('cancelled');
    expect(readLoginError()).toBe(null);
});
