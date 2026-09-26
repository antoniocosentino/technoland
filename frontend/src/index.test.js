import React from 'react';
import { Techno } from './index';
import { fetchPlayback } from './playback';

jest.mock('react-dom', () => ({ render: jest.fn() }));
jest.mock('./playback', () => ({ fetchPlayback: jest.fn() }));
jest.mock('./session', () => ({ readSession: () => null, readLoginError: () => null, playbackUrl: () => 'https://example.com/playback', connect: jest.fn(), disconnect: jest.fn() }));
const ReactDOM = jest.requireActual('react-dom');
let container;
let abort;
const originalController = global.AbortController;
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

beforeEach(() => {
    jest.useFakeTimers();
    abort = jest.fn();
    global.AbortController = class { constructor() { this.signal = {}; this.abort = abort; } };
    container = document.createElement('div');
    document.body.appendChild(container);
    fetchPlayback.mockReset();
});
afterEach(() => {
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
    jest.clearAllTimers();
    jest.useRealTimers();
    global.AbortController = originalController;
});

test('polls through idle, playing, unavailable and recovered playback', async () => {
    fetchPlayback.mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ title: 'Track', artist: 'Artist', albumImg: null, genres: ['techno'], answer: 'YES' })
        .mockRejectedValueOnce(new Error('Offline'))
        .mockResolvedValueOnce(null);
    ReactDOM.render(<Techno />, container);
    await flush();
    expect(container.textContent).toContain('not listening');
    jest.advanceTimersByTime(10000);
    await flush();
    expect(container.textContent).toContain('YES');
    expect(container.textContent).toContain('Track');
    jest.advanceTimersByTime(10000);
    await flush();
    expect(container.textContent).toContain('temporarily unavailable');
    expect(container.textContent).not.toContain('not listening');
    jest.advanceTimersByTime(10000);
    await flush();
    expect(container.textContent).toContain('not listening');
});

test('does not overlap pending requests and stops on unmount', async () => {
    let finish;
    fetchPlayback.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    ReactDOM.render(<Techno />, container);
    jest.advanceTimersByTime(20000);
    expect(fetchPlayback).toHaveBeenCalledTimes(1);
    ReactDOM.unmountComponentAtNode(container);
    expect(abort).toHaveBeenCalledTimes(1);
    finish(null);
    await flush();
    jest.advanceTimersByTime(20000);
    expect(fetchPlayback).toHaveBeenCalledTimes(1);
});
