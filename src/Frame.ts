import sharp from 'sharp';

export interface FrameData {
	data: Uint8ClampedArray;
	channels: number;
	height: number;
	width: number;
	frameNumber: number;
}

export default class Frame {
	public number: number;
	public sharp: sharp.Sharp;
	public data: Uint8ClampedArray;

	constructor(frameData: FrameData) {
		const { data, channels, height, width } = frameData;

		this.data = data;

		this.sharp = sharp(data, {
			raw: {
				width,
				height,
				channels: channels as any,
			},
		});

		this.number = frameData.frameNumber;
	}

	async render() {
		return new Uint8ClampedArray(await this.sharp.toBuffer());
	}
}
