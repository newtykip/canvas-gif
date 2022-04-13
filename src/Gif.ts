import sharp from 'sharp';
import Frame, { FrameData } from './Frame';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { Options } from './types';
import decodeGif from './decodeGif';

interface FrameRange {
	from: number;
	to: number;
}

type IncludedFrames = FrameRange | FrameRange[] | number | number[];

export default class Gif<T extends number> {
	private frames: Frame[];
	private options: Options<T>;
	private channels: number;
	private encoder: GIFEncoder;
	private repeat: number;
	private delay: number;

	#width: number;
	#height: number;

	// todo: allow for the creation of gifs from an empty canvas
	constructor(frames: FrameData[], options: Options<T>) {
		// Store the options
		this.options = options;

		// Find information about the frames
		this.frames = frames.map((frame) => new Frame(frame));
		this.#width = frames[0].width;
		this.#height = frames[0].height;
		this.channels = frames[0].channels;

		// Instantiate the encoder
		this.encoder = new GIFEncoder();
		this.repeat = 0;
		const fpsInteval = 1 / this.options.fps;
		this.delay = fpsInteval * 1000;

		if (this.options.repeat !== 'forever') {
			if (this.options.repeat === 1) this.repeat = -1;
			else this.repeat = this.options.repeat;
		}
	}

	public get width() {
		return this.#width;
	}

	public set width(newWidth: number) {
		this.resize(newWidth, this.#height);
	}

	public get height() {
		return this.#height;
	}

	public set height(newHeight: number) {
		this.resize(this.width, newHeight);
	}

	/**
	 * Resize the GIF to newly specified dimensions!
	 */
	public resize(width: number, height: number) {
		this.#width = width;
		this.#height = height;

		for (const frame of this.frames) {
			frame.sharp = frame.sharp.resize(width, height);
		}
	}

	/**
	 * Draw an image over the GIF!
	 */
	public async drawImage(
		image: Buffer | sharp.Sharp,
		x: number,
		y: number,
		width?: number,
		height?: number,
		includedFrames: IncludedFrames = [{ from: 1, to: this.frames.length }]
	) {
		// Make sure the image can not be bigger than the background GIF
		if (width > this.width) width = this.width;
		if (height > this.height) height = this.height;

		// Only resize the image if the inputted width and height differ to the GIF
		let sharpImage = image instanceof Buffer ? sharp(image) : image;
		const metadata = await sharpImage.metadata();

		if (height > this.height) height = this.height;
		if (width > this.width) width = this.width;

		if (metadata.height !== height || metadata.width !== width) {
			sharpImage = sharpImage.resize(
				width ?? metadata.width,
				height ?? metadata.height
			);
		}

		// todo: stop the image being placed off of the screen

		// Figure out which frames the image should be overlayed on
		let frameNumbers: number[] = [];

		const handleFrameRange = (range: FrameRange) => {
			if (range.from <= 0) range.from = 1;
			if (range.to > this.frames.length) range.to = this.frames.length;

			for (let i = range.from; i <= range.to; i++) {
				if (!frameNumbers.includes(i)) frameNumbers.push(i);
			}
		};

		if (Array.isArray(includedFrames)) {
			if (typeof includedFrames[0] === 'number') {
				frameNumbers = includedFrames as number[];
			} else {
				(includedFrames as FrameRange[]).forEach((range) =>
					handleFrameRange(range)
				);
			}
		} else if (typeof includedFrames === 'number') {
			frameNumbers.push(includedFrames);
		} else {
			handleFrameRange(includedFrames);
		}

		// Overlay the image on the frames that are within the specified range
		for (const frame of this.frames) {
			if (frameNumbers.includes(frame.number)) {
				frame.sharp = frame.sharp.composite([
					{
						input: await sharpImage.toBuffer(),
						top: y,
						left: x,
					},
				]);
			}
		}
	}

	// todo: account for differing fps - render the same image until a new one should show
	// todo: consider included frames
	public async drawGif<T extends number>(
		gif: Buffer | string | Gif<T>,
		x: number,
		y: number,
		width?: number,
		height?: number,
		loop: boolean = true
	) {
		if (typeof gif === 'string' || gif instanceof Buffer) {
			const { frames, fps, width, height, channels } = await decodeGif(
				gif,
				this.options?.coalesce ?? true
			);

			const { fps: oldFps, ...options } = this.options;

			gif = new Gif<T>(
				frames.map((data, i): FrameData => {
					return {
						data,
						height,
						width,
						channels,
						frameNumber: i + 1,
					};
				}),
				{
					fps,
					...(options as any),
				}
			);
		}

		const frameCount =
			loop || gif.frames.length >= this.frames.length
				? this.frames.length
				: gif.frames.length;

		// Handle size changes
		if (width > this.width) width = this.width;
		if (height > this.height) height = this.height;

		if (width !== gif.width || height !== gif.height)
			gif.resize(width ?? gif.width, height ?? gif.height);

		// If the size has not been customised, make sure the GIF is at most the same size as the base GIF
		if (!width && gif.width > this.width)
			gif.resize(this.width, gif.height);
		if (gif.height > this.height) gif.resize(gif.width, this.height);

		for (let i = 0; i < frameCount; i++) {
			this.frames[i].sharp = this.frames[i].sharp.composite([
				{
					input: await gif.frames[
						loop ? i % gif.frames.length : i
					].sharp.toBuffer(),
					top: y,
					left: x,
					raw: {
						width: gif.width,
						height: gif.height,
						channels: gif.channels as any,
					},
				},
			]);
		}
	}

	/**
	 * Render the GIF into a buffer!
	 */
	public async render() {
		// Write each frame to the encoder
		for (let i = 0; i < this.frames.length; i++) {
			if (this.options.verbose) {
				console.log(
					`Rendering frame ${i + 1}/${this.frames.length} (${(
						((i + 1) * 100) /
						this.frames.length
					).toFixed(2)}%)`
				);
			}

			const frame = this.frames[i];
			const data = await frame.render();
			const palette = quantize(data, 256);
			const index = applyPalette(data, palette);

			this.encoder.writeFrame(index, this.width, this.height, {
				palette,
				delay: this.delay,
				repeat: this.repeat,
			});
		}

		// Return the final buffer
		this.encoder.finish();
		const output = Buffer.from(this.encoder.buffer);
		this.encoder = new GIFEncoder();
		return output;
	}
}
