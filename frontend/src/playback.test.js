import { fetchPlayback } from './playback';

const url = 'https://example.com/playback/';
const originalFetch = global.fetch;
const playing = {
    is_playing: true,
    currently_playing_type: 'track',
    item: {
        name: 'At Peace',
        artists: [{ name: 'Propagandhi' }],
        album: { images: [{ url: 'https://example.com/cover.jpg' }] }
    }
};

function respond(data, status = 200) {
    global.fetch = jest.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        json: jest.fn().mockResolvedValue(data)
    });
}

afterEach(() => { global.fetch = originalFetch; });

test('reads playback in one backend request without Spotify credentials', async () => {
    respond(playing);
    expect(await fetchPlayback(url)).toEqual({
        genres: null, answer: 'UNKNOWN', title: 'At Peace', artist: 'Propagandhi', albumImg: 'https://example.com/cover.jpg'
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(url, {
        signal: undefined, cache: 'no-store', credentials: 'omit'
    });
});

test('handles missing artwork and multiple artists', async () => {
    respond({ ...playing, item: { name: 'Song', artists: [{ name: 'A' }, { name: 'B' }] } });
    expect(await fetchPlayback(url)).toEqual({ genres: null, answer: 'UNKNOWN', title: 'Song', artist: 'A, B', albumImg: null });
});

test('handles paused, empty, and non-track playback', async () => {
    for (const data of [null, { is_playing: false }, { is_playing: true, item: null },
        { ...playing, currently_playing_type: 'episode' }]) {
        respond(data);
        expect(await fetchPlayback(url)).toBe(null);
    }
    respond(null, 204);
    expect(await fetchPlayback(url)).toBe(null);
});

test('rejects unavailable endpoints and unexpected payloads', async () => {
    for (const [data, status] of [[{}, 503], [{ error: 'spotify_reconnect_required' }, 200],
        [{}, 200], [{ is_playing: true, item: {} }, 200]]) {
        respond(data, status);
        await expect(fetchPlayback(url)).rejects.toThrow();
    }
    await expect(fetchPlayback('')).rejects.toThrow('not configured');
});

test('propagates invalid JSON and network failures for the UI to handle', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200,
        json: () => Promise.reject(new Error('Invalid JSON')) });
    await expect(fetchPlayback(url)).rejects.toThrow('Invalid JSON');
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    await expect(fetchPlayback(url)).rejects.toThrow('Network error');
});

 test('classifies known genres and does not mistake missing genres for NO', async () => {
    for (const [genres, answer] of [[['minimal techno'], 'YES'], [['punk'], 'NO'], [[], 'UNKNOWN'], [null, 'UNKNOWN']]) {
        respond({ ...playing, genres });
        expect((await fetchPlayback(url)).answer).toBe(answer);
    }
 });
 test('sends only the companion session to the configured endpoint', async () => {
    respond(playing);
    await fetchPlayback(url, undefined, 'app-session');
    expect(global.fetch.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer app-session' });
 });
