import sharp from 'sharp';
import Frame, { FrameData } from './Frame';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { Options } from './types';

interface FrameRange {
	from: number;
	to: number;
}

export default class Gif<T extends number> {
	private frames: Frame[];
	private options: Options<T>;
	private width: number;
	private height: number;

	constructor(frames: FrameData[], options: Options<T>) {
		this.frames = frames.map((frame) => new Frame(frame));
		this.options = options;
		this.width = frames[0].width;
		this.height = frames[0].height;
	}

	async drawImage(
		image: Buffer,
		x: number,
		y: number,
		width?: number,
		height?: number,
		includedFrames: FrameRange | FrameRange[] = [
			{ from: 1, to: this.frames.length },
		]
	) {
		// Make sure the image can not be bigger than the background GIF
		if (width > this.width) width = this.width;
		if (height > this.height) height = this.height;

		// Only resize the image if the inputted width and height differ to the GIF
		const sharpImage = sharp(image);
		const metadata = await sharpImage.metadata();

		if (metadata.height !== height || metadata.width !== width) {
			image = await sharpImage
				.resize(width ?? metadata.width, height ?? metadata.height)
				.toBuffer();
		}

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
			includedFrames.forEach((range) => handleFrameRange(range));
		} else {
			handleFrameRange(includedFrames);
		}

		// Overlay the image on the frames that are within the specified range
		this.frames.forEach((frame) => {
			if (frameNumbers.includes(frame.number)) {
				frame.sharp = frame.sharp.composite([
					{
						input: image,
						top: y,
						left: x,
					},
				]);
			}
		});
	}

	async render() {
		// Form the encoder and calculate some important properties!
		const gif = new GIFEncoder();
		const fpsInterval = 1 / this.options.fps;
		const delay = fpsInterval * 1000;
		let resolvedRepeat = 0;

		if (this.options.repeat !== 'forever') {
			if (this.options.repeat === 1) resolvedRepeat = -1;
			else resolvedRepeat = this.options.repeat;
		}

		// Write each frame to the encoder
		for (const frame of this.frames) {
			const data = await frame.renderFrame();
			const palette = quantize(data, 256);
			const index = applyPalette(data, palette);

			gif.writeFrame(index, this.width, this.height, {
				palette,
				delay,
				repeat: resolvedRepeat,
			});
		}

		// Return the final buffer
		gif.finish();
		return Buffer.from(gif.buffer);
	}
}
