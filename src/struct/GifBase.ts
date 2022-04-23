import sharp from 'sharp';
import type CSS from 'csstype';
import fs from 'fs';
import path from 'path';
import Frame from './Frame';
import type { Options, Repeat } from '../types/Options';
import { defaultOptions } from '../types/Options';
import Gif from '..';
import gm from 'gm';
import os from 'os';
import isGmInstalled from 'gm-installed';
import GifEncoder from 'gif-encoder-2';

interface FrameRange {
	from: number;
	to: number;
}

interface QueuePiece {
	overlay: sharp.OverlayOptions;
	frames: number[];
}

interface RGB {
	r: number;
	g: number;
	b: number;
}

interface ImageOptions {
	width?: number;
	height?: number;
	includedFrames?: IncludedFrames;
	round?: boolean;
	border?:
		| boolean
		| {
				colour?: Hex;
				thickness?: number;
		  };
}

const roundedCorners = (width: number, height: number) =>
	Buffer.from(
		`<svg><rect x="0" y="0" width="${width}" height="${height}" rx="${width}" ry="${height}" /></svg>`
	);

type IncludedFrames = FrameRange | FrameRange[] | number | number[];
type FontWeight = 'normal' | 'bold' | 'bolder' | 'lighter' | number;
type Hex = `#${string}`;
type SVGProperties = Omit<CSS.SvgProperties, 'stroke'>;

// todo: add frames to the gif at specified places (append gif?)
// todo: border assertion
export default class GifBase {
	#frames: Frame[] = [];
	#channels: number;

	private options: Options;
	private delay: number;
	private queue: QueuePiece[] = [];

	public fontSize: number = 20;
	public fontName: string = 'sans';
	public fontWeight: FontWeight = 'normal';

	public repeat: Repeat;
	public brushColour: Hex = '#000000';
	#fps: number;
	#width: number;
	#height: number;

	// todo: allow for the creation of gifs from an empty canvas
	constructor(
		width: number,
		height: number,
		channels: number,
		options?: Options
	) {
		this.options = options;

		this.#width = width;
		this.#height = height;
		this.#channels = channels;

		this.repeat = this.options?.repeat ?? defaultOptions.repeat;
		this.fps = this.options?.fps ?? defaultOptions.fps;
		this.options.verbose ??= defaultOptions.verbose;
		this.options.gm ??= defaultOptions.gm;
		this.options.coalesce ??= defaultOptions.coalesce;
	}

	public get channels() {
		return this.#channels;
	}

	public get frames() {
		return this.#frames;
	}

	public get fps() {
		return this.#fps;
	}

	public set fps(newFps: number) {
		this.#fps = newFps;

		const fpsInteval = 1 / newFps;
		this.delay = fpsInteval * 1000;
	}

	public get frameCount() {
		return this.frames.length;
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

	// todo: temp, make this better
	public addFrame(frame: Frame) {
		this.#frames.push(frame);
	}

	/**
	 * Turn an included frames object into a list of frame numbers.
	 */
	private generateFrameRange(includedFrames: IncludedFrames): number[] {
		let frameNumbers: number[] = [];

		const handleFrameRange = (range: FrameRange) => {
			if (range.from <= 0) range.from = 1;
			if (range.to > this.frameCount) range.to = this.frameCount;
			for (let i = range.from; i <= range.to; i++) {
				if (!frameNumbers.includes(i)) frameNumbers.push(i);
			}
		};

		if (!includedFrames) {
			for (let i = 1; i <= this.frameCount; i++) {
				frameNumbers.push(i);
			}
		} else if (Array.isArray(includedFrames)) {
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

		return frameNumbers;
	}

	/**
	 * Mass edit a bunch of frames with the same method.
	 */
	private editFrames(
		includedFrames: IncludedFrames,
		callback: (sharp: sharp.Sharp) => sharp.Sharp
	): this {
		const frameNumbers = this.generateFrameRange(includedFrames);

		for (const frame of this.frames) {
			if (
				(includedFrames && frameNumbers.includes(frame.number)) ||
				!includedFrames
			) {
				frame.sharp = callback(frame.sharp);
			}
		}

		return this;
	}

	/**
	 * Convert a list of SVG properties to a string
	 */
	private stylesToString(styles: CSS.SvgProperties): string {
		let output = '';

		for (const key in styles) {
			const name = key
				.split('')
				.map((letter, idx) => {
					return letter.toUpperCase() === letter
						? `${idx !== 0 ? '-' : ''}${letter.toLowerCase()}`
						: letter;
				})
				.join('');

			output += ` ${name}="${styles[key]}"`;
		}

		return output.trimLeft();
	}

	/**
	 * Utility to quickly draw borders!
	 */
	private drawBorder(
		x: number,
		y: number,
		width: number,
		height: number,
		round: boolean,
		includedFrames: IncludedFrames,
		colour: Hex = this.brushColour,
		thickness: number = 4
	): this {
		const oldBrush = this.brushColour;
		this.brushColour = colour;

		if (round) {
			this.drawCircle(
				x + width / 2,
				y + height / 2,
				width / 2,
				{
					strokeWidth: `${thickness}px`,
				},
				includedFrames
			);
		} else {
			this.drawRect(
				x - thickness / 2,
				y - thickness / 2,
				width + thickness,
				height + thickness,
				{
					strokeWidth: `${thickness}px`,
				},
				includedFrames
			);
		}

		this.brushColour = oldBrush;
		return this;
	}

	/**
	 * Resize the GIF to newly specified dimensions!
	 */
	public resize(width: number, height: number): this {
		this.#width = width;
		this.#height = height;

		return this.editFrames(null, (sharp) => sharp.resize(width, height));
	}

	/**
	 * Crop the GIF to newly specified dimensions!
	 */
	public crop(x: number, y: number, width: number, height: number): this {
		this.#width = width;
		this.#height = height;

		return this.editFrames(null, (sharp) =>
			sharp.extract({ left: x, top: y, width, height })
		);
	}

	// todo: utils to make sure the text fits
	/**
	 * Draw text on the GIF!
	 */
	public drawText(
		text: string,
		x: number,
		y: number,
		styles?: SVGProperties,
		includedFrames: IncludedFrames = [{ from: 1, to: this.frameCount }]
	): this {
		const svg = Buffer.from(`
<svg width="${this.width}" height="${this.height}">
    <text x="${x}px" y="${y}px" ${this.stylesToString({
			fontFamily: styles?.fontFamily ?? this.fontName,
			fontWeight: styles?.fontWeight ?? this.fontWeight,
			fontSize: styles?.fontSize ?? `${this.fontSize}px`,
			fill: styles?.fill ?? this.brushColour,
			...styles,
		})}>${text}</text>
</svg>
		`);

		this.queue.push({
			overlay: {
				input: svg,
			},
			frames: this.generateFrameRange(includedFrames),
		});

		return this;
	}

	/**
	 * Draw a rectangle on the GIF!
	 */
	public drawRect(
		x: number,
		y: number,
		width: number,
		height: number,
		styles?: SVGProperties,
		includedFrames: IncludedFrames = [{ from: 1, to: this.frameCount }]
	): this {
		const svg = Buffer.from(`
<svg width="${this.width}" height="${this.height}">
	<rect width="${width}px" height="${height}px" x="${x}px" y="${y}px" ${this.stylesToString(
			{
				stroke: this.brushColour,
				fill: styles?.fill ?? 'none',
				strokeWidth: styles?.strokeWidth ?? '4px',
				...styles,
			}
		)} />
</svg>
		`);

		this.queue.push({
			overlay: {
				input: svg,
			},
			frames: this.generateFrameRange(includedFrames),
		});

		return this;
	}

	/**
	 * Draw a circle on the GIF!
	 */
	public drawCircle(
		cx: number,
		cy: number,
		radius: number,
		styles?: SVGProperties,
		includedFrames: IncludedFrames = [{ from: 1, to: this.frameCount }]
	): this {
		const svg = Buffer.from(`
<svg width="${this.width}" height="${this.height}">
	<circle cx="${cx}px" cy="${cy}px" r="${radius}px" ${this.stylesToString({
			stroke: this.brushColour,
			fill: styles?.fill ?? 'none',
			strokeWidth: styles?.strokeWidth ?? '4px',
			...styles,
		})} />
</svg>
		`);

		this.queue.push({
			overlay: {
				input: svg,
			},
			frames: this.generateFrameRange(includedFrames),
		});

		return this;
	}

	/**
	 * Draw an image over the GIF!
	 */
	public async drawImage(
		image: Buffer | sharp.Sharp,
		x: number,
		y: number,
		options?: ImageOptions
	) {
		let { width, height, round, includedFrames, border } = options;
		includedFrames ??= [{ from: 1, to: this.frameCount }];

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

		if (round) {
			sharpImage.composite([
				{
					input: roundedCorners(width, height),
					blend: 'dest-in',
				},
			]);
		}

		if (border)
			this.drawBorder(
				x,
				y,
				width,
				height,
				round,
				null,
				(border as any)?.colour,
				(border as any)?.thickness
			);

		// todo: stop the image being placed off of the screen
		this.queue.push({
			overlay: {
				input: await sharpImage.toBuffer(),
				top: y,
				left: x,
			},
			frames: this.generateFrameRange(includedFrames),
		});
	}

	// todo: test to ensure that the fps matches up
	// todo: consider included frames
	/**
	 * Draw a GIF over the GIF!
	 */
	public async drawGif(
		gif: Buffer | GifBase,
		x: number,
		y: number,
		options?: Omit<ImageOptions, 'includedFrames'> & {
			loop?: boolean;
			fps?: number;
		}
	) {
		let { width, height, loop, round, border, fps } = options;
		loop ??= true;

		if (gif instanceof Buffer) {
			gif = await Gif.fromBuffer(gif, {
				coalesce: this.options?.coalesce ?? true,
			});
		}

		const frameCount =
			loop || gif.frameCount >= this.frameCount
				? this.frameCount
				: gif.frameCount;

		// Handle size changes
		if (!width) width = gif.width;
		if (!height) height = gif.height;
		if (width > this.width || (!width && gif.width > this.width))
			width = this.width;
		if (height > this.height || gif.height > this.height)
			height = this.height;

		if (width !== gif.width || height !== gif.height)
			gif.resize(width ?? gif.width, height ?? gif.height);

		if (border)
			this.drawBorder(
				x,
				y,
				width,
				height,
				round,
				null,
				(border as any)?.colour,
				(border as any)?.thickness
			);

		const sourceFramesPerInputFrame = Math.round(
			this.#fps / (fps ?? gif.#fps)
		);

		let frameIndex = 0;

		for (let i = 0; i < frameCount; i++) {
			if (i % sourceFramesPerInputFrame === 0) frameIndex++;

			const raw = !round
				? {
						width: gif.width,
						height: gif.height,
						channels: gif.channels as any,
				  }
				: null;

			let sharp =
				gif.frames[loop ? frameIndex % gif.frameCount : frameIndex]
					.sharp;

			if (round)
				sharp = sharp
					.composite([
						{
							input: roundedCorners(width, height),
							blend: 'dest-in',
						},
					])
					.png();

			this.queue.push({
				overlay: {
					input: await sharp.toBuffer(),
					top: y,
					left: x,
					raw,
				},
				frames: [i + 1],
			});
		}

		return this;
	}

	// todo: test sharp parity

	/**
	 * Tint the GIF using the provided chroma while preserving the image luminance
	 */
	public tint(
		rgb: RGB,
		includedFrames: IncludedFrames = [{ from: 1, to: this.frameCount }]
	): this {
		return this.editFrames(includedFrames, (sharp) => sharp.tint(rgb));
	}

	/**
	 * Convert the GIF to 8-bit greyscale; 256 shades of grey
	 */
	public grayscale(
		includedFrames: IncludedFrames = [{ from: 1, to: this.frameCount }]
	): this {
		return this.editFrames(includedFrames, (sharp) => sharp.grayscale());
	}

	/**
	 * Rotate the GIF by an angle!
	 */
	public rotate(
		angle: number,
		includedFrames: IncludedFrames = [{ from: 1, to: this.frameCount }]
	): this {
		return this.editFrames(includedFrames, (sharp) => sharp.rotate(angle));
	}

	/**
	 * Flip/flop the GIF about an axis!
	 */
	public flip(
		axis: 'X' | 'Y',
		includedFrames: IncludedFrames = [{ from: 1, to: this.frameCount }]
	): this {
		return this.editFrames(includedFrames, (sharp) =>
			axis === 'Y' ? sharp.flip() : sharp.flop()
		);
	}

	/**
	 * Blur the GIF. When used without a radius, performs a fast, mild blur of the output image. When a radius is provided, performs a slower, more accurate Gaussian blur.
	 */
	public blur(
		radius?: number,
		includedFrames: IncludedFrames = [{ from: 1, to: this.frameCount }]
	): this {
		// sigma = 1 + radius / 2
		return this.editFrames(includedFrames, (sharp) =>
			sharp.blur(radius ? 1 + radius / 2 : null)
		);
	}

	/**
	 * Produce the "negative" of the GIF
	 */
	public negate(
		includedFrames: IncludedFrames = [{ from: 1, to: this.frameCount }]
	): this {
		return this.editFrames(includedFrames, (sharp) => sharp.negate());
	}

	/**
	 * Enhance output image contrast by stretching its luminance to cover the full dynamic range.
	 */
	public normalise(
		includedFrames: IncludedFrames = [{ from: 1, to: this.frameCount }]
	): this {
		return this.editFrames(includedFrames, (sharp) => sharp.normalise());
	}

	/**
	 * Render the GIF as a Buffer!
	 */
	public async render(): Promise<Buffer> {
		this.applyEdits();

		// GM encoding
		if (this.options?.gm && isGmInstalled()) {
			const gif = gm(this.width, this.height).setFormat('gif');
			// todo: research whether this can be done without disk writes
			const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gif-'));

			await this.dumpFrames(tempDir);

			for (const file of fs.readdirSync(tempDir).sort((a, b) =>
				a.localeCompare(b, undefined, {
					numeric: true,
					sensitivity: 'base',
				})
			)) {
				gif.in(path.join(tempDir, file));
			}

			gif.delay(this.delay / 10);

			return new Promise<Buffer>((resolve, reject) =>
				gif.toBuffer((err, buffer) => {
					fs.rmSync(tempDir, { recursive: true, force: true });

					if (err) reject(err);
					else resolve(buffer);
				})
			);
		}

		// Backup GIF encoding
		// todo: remove the need for this, bundle gm in with the package
		else {
			const gif = new GifEncoder(this.width, this.height);

			if (this.options?.gm && this.options?.verbose) {
				console.log(
					'You have the gm option enabled, but I can not seem to find GraphicsMagick installed on your system! Please make sure that it is accessible in your PATH (:'
				);
			}

			gif.setDelay(this.delay);
			gif.setRepeat(this.repeat === 'forever' ? 0 : this.repeat);
			gif.start();

			for (const frame of this.frames) {
				gif.addFrame(await frame.getPixelData());
			}

			gif.finish();

			return gif.out.getData();
		}
	}

	/**
	 * Apply all of the edits currently in the queue, and then clear it!
	 */
	public applyEdits(): this {
		for (const frame of this.frames) {
			const overlays = this.queue
				.filter((layer) => layer.frames.includes(frame.number))
				.map((layer) => layer.overlay);

			frame.sharp = frame.sharp.composite(overlays);
		}

		this.queue = [];
		return this;
	}

	/**
	 * Dump all of the frames in their current state into a folder.
	 * @see If the output is not as expected, try running .applyEdits() first!
	 */
	// todo: find suitable formats
	public dumpFrames(folderPath: string, format: string = 'png') {
		if (!fs.existsSync(folderPath))
			fs.mkdirSync(folderPath, { recursive: true });

		const frames: Promise<sharp.OutputInfo>[] = [];

		for (const frame of this.frames) {
			frames.push(
				frame.sharp.toFile(
					path.resolve(folderPath, `${frame.number}.${format}`)
				)
			);
		}

		return Promise.all(frames);
	}
}
