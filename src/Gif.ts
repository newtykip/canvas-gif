import sharp from 'sharp';
import Frame, { FrameData } from './Frame';
// import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import GIFEncoder from 'gif-encoder-2';
import decodeGif from './decodeGif';
import type CSS from 'csstype';

type Positive<T extends number> = number extends T
	? never
	: `${T}` extends `-${string}` | `${string}.${string}`
	? never
	: T;

export interface Options<T extends number> {
	/**
	 * Whether the gif should first be coalesced
	 * @default true
	 */
	coalesce?: boolean;

	/**
	 * How many times the GIF should repeat
	 * @default 'forever'
	 */
	repeat?: Positive<T> | 'forever';

	/**
	 * How many frames to render per second
	 * @default Source GIF frame count
	 */
	fps?: number;

	/**
	 * Whether the libary should log about its process when rendering GIFs
	 * @default false
	 */
	verbose?: boolean;
}

interface FrameRange {
	from: number;
	to: number;
}

interface Element {
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
// todo: docs
// todo: .applyEdits() ? .dumpFrames(dir) ?
export default class Gif<T extends number> {
	private frames: Frame[];
	private options: Options<T>;
	private channels: number;
	private encoder: GIFEncoder;
	private elements: Element[] = [];

	public fontSize: number = 20;
	public fontName: string = 'sans';
	public fontWeight: FontWeight = 'normal';
	public frameCount: number;

	#brushColour: Hex = '#000000';
	#width: number;
	#height: number;

	// todo: allow for the creation of gifs from an empty canvas
	constructor(frames: FrameData[], options: Options<T>) {
		// Store the options
		this.options = options;

		// Find information about the frames
		this.frames = frames.map((frame) => new Frame(frame));
		this.frameCount = this.frames.length;
		this.#width = frames[0].width;
		this.#height = frames[0].height;
		this.channels = frames[0].channels;

		// Instantiate the encoder
		this.encoder = new GIFEncoder(this.#width, this.#height);

		let repeat = 0;

		if (this.options.repeat !== 'forever') {
			if (this.options.repeat === 1) repeat = -1;
			else repeat = this.options.repeat;
		}

		this.encoder.setFrameRate(this.options.fps);
		this.encoder.setRepeat(repeat);
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

	public get brushColour() {
		return this.#brushColour;
	}

	// todo: allow for non-hex colours
	public set brushColour(hex: Hex) {
		this.#brushColour = hex;
	}

	private generateFrameRange(includedFrames: IncludedFrames) {
		let frameNumbers: number[] = [];

		const handleFrameRange = (range: FrameRange) => {
			if (range.from <= 0) range.from = 1;
			if (range.to > this.frames.length) range.to = this.frames.length;
			for (let i = range.from; i <= range.to; i++) {
				if (!frameNumbers.includes(i)) frameNumbers.push(i);
			}
		};

		if (!includedFrames) {
			for (let i = 1; i <= this.frames.length; i++) {
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

	private editFrames(
		includedFrames: IncludedFrames,
		callback: (sharp: sharp.Sharp) => sharp.Sharp
	) {
		const frameNumbers = this.generateFrameRange(includedFrames);

		for (const frame of this.frames) {
			if (frameNumbers.includes(frame.number)) {
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
	 * Resize the GIF to newly specified dimensions!
	 */
	public resize(width: number, height: number) {
		this.#width = width;
		this.#height = height;

		return this.editFrames(null, (sharp) => sharp.resize(width, height));
	}

	public crop(x: number, y: number, width: number, height: number) {
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
		includedFrames: IncludedFrames = [{ from: 1, to: this.frames.length }]
	) {
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

		this.elements.push({
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
		includedFrames: IncludedFrames = [{ from: 1, to: this.frames.length }]
	) {
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

		this.elements.push({
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
		includedFrames: IncludedFrames = [{ from: 1, to: this.frames.length }]
	) {
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

		this.elements.push({
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
		includedFrames ??= [{ from: 1, to: this.frames.length }];

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

		if (border) {
			const oldBrush = this.brushColour;
			if (typeof border !== 'boolean')
				this.brushColour = border?.colour ?? oldBrush;

			const thickness =
				typeof border !== 'boolean' ? border?.thickness ?? 4 : 4;

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
		}

		// todo: stop the image being placed off of the screen
		this.elements.push({
			overlay: {
				input: await sharpImage.toBuffer(),
				top: y,
				left: x,
			},
			frames: this.generateFrameRange(includedFrames),
		});
	}

	// todo: account for differing fps - render the same image until a new one should show
	// todo: consider included frames
	public async drawGif<T extends number>(
		gif: Buffer | string | Gif<T>,
		x: number,
		y: number,
		options?: Omit<ImageOptions, 'includedFrames'> & {
			loop?: boolean;
		}
	) {
		let { width, height, loop, round, border } = options;
		loop ??= true;

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
		if (!width) width = gif.width;
		if (!height) height = gif.height;
		if (width > this.width) width = this.width;
		if (height > this.height) height = this.height;

		if (width !== gif.width || height !== gif.height)
			gif.resize(width ?? gif.width, height ?? gif.height);

		// If the size has not been customised, make sure the GIF is at most the same size as the base GIF
		if (!width && gif.width > this.width)
			gif.resize(this.width, gif.height);
		if (gif.height > this.height) gif.resize(gif.width, this.height);

		if (border) {
			const oldBrush = this.brushColour;
			if (typeof border !== 'boolean')
				this.brushColour = border?.colour ?? oldBrush;

			const thickness =
				typeof border !== 'boolean' ? border?.thickness ?? 4 : 4;

			if (round) {
				this.drawCircle(
					x + width / 2,
					y + height / 2,
					width / 2,
					{
						strokeWidth: `${thickness}px`,
					}
					// includedFrames
				);
			} else {
				this.drawRect(
					x - thickness / 2,
					y - thickness / 2,
					width + thickness,
					height + thickness,
					{
						strokeWidth: `${thickness}px`,
					}
					// includedFrames
				);
			}

			this.brushColour = oldBrush;
		}

		for (let i = 0; i < frameCount; i++) {
			const raw = !round
				? {
						width: gif.width,
						height: gif.height,
						channels: gif.channels as any,
				  }
				: null;

			let sharp = gif.frames[loop ? i % gif.frames.length : i].sharp;

			if (round)
				sharp = sharp
					.composite([
						{
							input: roundedCorners(width, height),
							blend: 'dest-in',
						},
					])
					.png();

			this.elements.push({
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

	// sharp parity

	public tint(
		rgb: RGB,
		includedFrames: IncludedFrames = [{ from: 1, to: this.frames.length }]
	) {
		return this.editFrames(includedFrames, (sharp) => sharp.tint(rgb));
	}

	public grayscale(
		includedFrames: IncludedFrames = [{ from: 1, to: this.frames.length }]
	) {
		return this.editFrames(includedFrames, (sharp) => sharp.grayscale());
	}

	public rotate(
		angle: number,
		includedFrames: IncludedFrames = [{ from: 1, to: this.frames.length }]
	) {
		return this.editFrames(includedFrames, (sharp) => sharp.rotate(angle));
	}

	public flip(
		axis: 'X' | 'Y',
		includedFrames: IncludedFrames = [{ from: 1, to: this.frames.length }]
	) {
		return this.editFrames(includedFrames, (sharp) =>
			axis === 'Y' ? sharp.flip() : sharp.flop()
		);
	}

	public blur(
		radius?: number,
		includedFrames: IncludedFrames = [{ from: 1, to: this.frames.length }]
	) {
		// sigma = 1 + radius / 2
		return this.editFrames(includedFrames, (sharp) =>
			sharp.blur(radius ? 1 + radius / 2 : null)
		);
	}

	public negate(
		includedFrames: IncludedFrames = [{ from: 1, to: this.frames.length }]
	) {
		return this.editFrames(includedFrames, (sharp) => sharp.negate());
	}

	public normalise(
		includedFrames: IncludedFrames = [{ from: 1, to: this.frames.length }]
	) {
		return this.editFrames(includedFrames, (sharp) => sharp.normalise());
	}

	/**
	 * Render the GIF into a buffer!
	 */
	public async render() {
		this.encoder.start();

		for (let i = 0; i < this.frames.length; i++) {
			if (this.options.verbose) {
				console.log(
					`Rendering frame ${i + 1}/${this.frames.length} (${(
						((i + 1) * 100) /
						this.frames.length
					).toFixed(2)}%)`
				);
			}

			// Render the edits to each frame from the elements system
			const frame = this.frames[i];
			const overlays = this.elements
				.filter((layer) => layer.frames.includes(frame.number))
				.map((layer) => layer.overlay);

			frame.sharp = frame.sharp.composite(overlays);

			// Write each frame to the encoder
			this.encoder.addFrame(await frame.render());
		}

		this.encoder.finish();

		// Return the final buffer
		return this.encoder.out.getData();
	}
}
