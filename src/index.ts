import type { Options } from './types/Options';
import GifBase, { defaultOptions } from './struct/GifBase';
import GeneratedGif from './struct/GeneratedGif';
import decodeGif from './utils/decodeGif';
import { fromBuffer as getFileType } from 'file-type';
import fs from 'fs';
import Frame from './struct/Frame';
import sharp from 'sharp';

class Gif extends GifBase {
	constructor(
		width: number,
		height: number,
		frameCount: number,
		options?: Options
	) {
		super(width, height, 4, options);

		for (let i = 0; i < frameCount; i++) {
			const frame = new Frame(
				i + 1,
				sharp({
					create: {
						width,
						height,
						channels: 4,
						background: {
							r: 0,
							g: 0,
							b: 0,
						},
					},
				})
			);

			this.addFrame(frame);
		}
	}

	/**
	 * Load a GIF from a Buffer
	 */
	static async fromBuffer(buffer: Buffer, options?: Options) {
		const { frames, fps, width, height, channels } = await decodeGif(
			buffer,
			options?.coalesce ?? true
		);

		return new GeneratedGif(
			frames.map((data, i) => {
				return {
					data,
					channels,
					height,
					width,
					frameNumber: i + 1,
				};
			}),
			{
				coalesce: options?.coalesce ?? defaultOptions.coalesce,
				repeat: options?.repeat ?? defaultOptions.repeat,
				fps: options?.fps ?? fps ?? defaultOptions.fps,
				verbose: options?.verbose ?? defaultOptions.verbose,
			}
		);
	}

	/**
	 * Load a GIF from a path
	 */
	static async fromPath(path: string, options?: Options) {
		try {
			const buffer = fs.readFileSync(path);

			// Ensure that the buffer found is that of a GIF!
			const { mime } = await getFileType(buffer);
			if (mime !== 'image/gif') throw new Error();

			return Gif.fromBuffer(buffer, options);
		} catch (error) {
			throw new Error('No GIF found at path.');
		}
	}
}

export = Gif;
