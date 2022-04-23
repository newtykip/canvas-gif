import sharp from 'sharp';

export default class Frame {
	public sharp: sharp.Sharp;
	public number: number;

	constructor(frameNumber: number, sharp: sharp.Sharp) {
		this.number = frameNumber;
		this.sharp = sharp;
	}

	async getPixelData() {
		return new Uint8ClampedArray(await this.sharp.toBuffer());
	}
}
