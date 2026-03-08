/**
 * DOM Capture utilities for video export.
 *
 * Uses the native Canvas 2D drawImage approach for maximum speed:
 * the export PhonePreview draws directly to a visible (offscreen-positioned)
 * div.  We capture that div by drawing it into a canvas using the browser's
 * built-in rendering — no slow DOM-to-SVG serialisation.
 */

export interface CaptureOptions {
	width: number;
	height: number;
	scale: number;
	backgroundColor: string;
}

export interface FrameCaptureResult {
	canvas: HTMLCanvasElement;
	dataUrl: string;
}

export interface DownloadBlobOptions {
	revokeAfterMs?: number;
}

/**
 * Capture an HTML element to a canvas using modern-screenshot.
 * Uses SVG foreignObject under the hood so the browser's native CSS
 * engine handles oklch(), modern gradients, backdrop-filter, etc.
 *
 * NOTE: this is the "cold" path — used once or infrequently (e.g. thumbnail).
 * For per-frame video export we skip this entirely and use the
 * faster captureStream(0) approach in VideoExporter.
 */
export async function captureElement(
	element: HTMLElement,
	options: CaptureOptions
): Promise<HTMLCanvasElement> {
	const { domToCanvas } = await import('modern-screenshot');

	const canvas = await domToCanvas(element, {
		width: options.width,
		height: options.height,
		scale: options.scale,
		backgroundColor: options.backgroundColor,
		font: {
			preferredFormat: 'woff2'
		},
		style: {
			transformOrigin: 'top left'
		},
		debug: false
	});

	return canvas;
}

export async function captureElementToCanvas(
	element: HTMLElement,
	targetCanvas: HTMLCanvasElement,
	options: CaptureOptions
): Promise<void> {
	const capturedCanvas = await captureElement(element, options);

	const ctx = targetCanvas.getContext('2d');
	if (!ctx) return;

	ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
	ctx.drawImage(capturedCanvas, 0, 0, targetCanvas.width, targetCanvas.height);
}

export function createOffscreenCanvas(width: number, height: number): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	return canvas;
}

export function getCanvasStream(canvas: HTMLCanvasElement, fps: number): MediaStream {
	return canvas.captureStream(fps);
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) {
					resolve(blob);
				} else {
					reject(new Error('Failed to convert canvas to blob'));
				}
			},
			type,
			1.0
		);
	});
}

function resolveObjectUrlLifetimeMs(blob: Blob, requestedMs?: number): number {
	if (typeof requestedMs === 'number' && Number.isFinite(requestedMs) && requestedMs >= 0) {
		return Math.round(requestedMs);
	}

	// Keep URL alive briefly to avoid retaining large blobs after download starts.
	const estimatedTransferMs = (blob.size / (50 * 1024 * 1024)) * 1000;
	return Math.round(Math.min(8_000, Math.max(2_000, 1_000 + estimatedTransferMs)));
}

export function downloadBlob(
	blob: Blob,
	filename: string,
	options: DownloadBlobOptions = {}
): Promise<void> {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.style.display = 'none';

	document.body.appendChild(link);
	let cleaned = false;
	const cleanup = () => {
		if (cleaned) return;
		cleaned = true;
		if (link.isConnected) {
			document.body.removeChild(link);
		}
		URL.revokeObjectURL(url);
	};

	try {
		link.click();
	} catch (error) {
		cleanup();
		throw error;
	}

	if (link.isConnected) {
		document.body.removeChild(link);
	}

	const lifetimeMs = resolveObjectUrlLifetimeMs(blob, options.revokeAfterMs);
	return new Promise((resolve) => {
		window.setTimeout(() => {
			cleanup();
			resolve();
		}, lifetimeMs);
	});
}
