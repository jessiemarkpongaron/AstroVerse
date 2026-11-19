// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { buildChart } from '../../lib/astro/chart.ts';
import { ShareCardButton } from './ShareCardButton.tsx';

const chart = buildChart({
  date: '1990-05-31',
  time: '15:30',
  timeAccuracy: 'exact',
  place: { name: 'Carrascal', lat: 9.37028, lon: 125.94917, tz: 'Asia/Manila' },
});

const texts: string[] = [];
const fakeCtx = new Proxy(
  {},
  {
    get: (_t, key) => {
      if (key === 'fillText') return (t: string) => texts.push(t);
      if (key === 'measureText') return (t: string) => ({ width: t.length * 18 });
      if (key === 'createLinearGradient') return () => ({ addColorStop: () => {} });
      return () => {};
    },
    set: () => true,
  },
);

beforeEach(() => {
  texts.length = 0;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    fakeCtx as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) =>
    cb(new Blob(['png'], { type: 'image/png' })),
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,AA');
});

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'canShare');
  Reflect.deleteProperty(navigator, 'share');
});

describe('ShareCardButton', () => {
  it('opens the share sheet with a PNG when the device can share files', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { canShare: () => true, share });
    render(<ShareCardButton chart={chart} />);
    fireEvent.click(screen.getByRole('button', { name: 'Share my Big Three image' }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const file = (share.mock.calls[0]?.[0] as { files: File[] }).files[0];
    expect(file?.name).toBe('my-big-three.png');
    expect(file?.type).toBe('image/png');
    expect(texts).toContain('Gemini');
    expect(await screen.findByRole('img', { name: 'Your Big Three image' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Shared!');
  });

  it('downloads the PNG when the device cannot share files', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<ShareCardButton chart={chart} />);
    fireEvent.click(screen.getByRole('button', { name: 'Share my Big Three image' }));
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('status')).toHaveTextContent('Image saved to your downloads.');
  });

  it('closing the share sheet is not an error', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('cancel', 'AbortError'));
    Object.assign(navigator, { canShare: () => true, share });
    render(<ShareCardButton chart={chart} />);
    fireEvent.click(screen.getByRole('button', { name: 'Share my Big Three image' }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('explains when the image cannot be made', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(<ShareCardButton chart={chart} />);
    fireEvent.click(screen.getByRole('button', { name: 'Share my Big Three image' }));
    expect(await screen.findByText(/Couldn’t make the image/)).toBeVisible();
  });
});
