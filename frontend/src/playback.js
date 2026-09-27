// The PHP backend owns Spotify authorization. Only public playback data is
// requested here; no Spotify credentials or tokens belong in the browser.
export async function fetchPlayback(url, signal, session) {
    if (!url) {
        throw new Error('The playback endpoint is not configured.');
    }

    const response = await fetch(url, {
        signal,
        cache: 'no-store',
        credentials: 'omit',
        ...(session ? { headers: { Authorization: `Bearer ${session}` } } : {})
    });

    if (!response.ok) {
        throw new Error('Playback is temporarily unavailable.');
    }
    if (response.status === 204) return null;

    const data = await response.json();
    if (data && data.error) {
        throw new Error('Playback is temporarily unavailable.');
    }
    if (!data || data.is_playing === false) return null;
    if (data.is_playing !== true) {
        throw new Error('Unexpected playback response.');
    }

    const song = data.item;
    if (!song || (data.currently_playing_type && data.currently_playing_type !== 'track')) {
        return null;
    }
    if (!song.name || !Array.isArray(song.artists)) {
        throw new Error('Unexpected track response.');
    }

    const images = song.album && song.album.images;
    const genres = Array.isArray(data.genres) ? data.genres.filter(genre => typeof genre === 'string') : null;
    const genreWhitelist = ['electro house', 'tech house'];
    const isTechno = genre => /\btechno\b/i.test(genre) || genreWhitelist.indexOf(genre.toLowerCase()) >= 0;
    return {
        genres,
        answer: !genres || !genres.length ? 'UNKNOWN' : genres.some(isTechno) ? 'YES' : 'NO',
        title: song.name,
        artist: song.artists.map(artist => artist.name).filter(Boolean).join(', '),
        albumImg: Array.isArray(images) && images.length ? images[0].url : null
    };
}
