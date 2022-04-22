import sharp from 'sharp';

export default class Frame {
	public sharp: sharp.Sharp;
	public number: number;

	constructor(frameNumber: number, sharp: sharp.Sharp) {
		this.number = frameNumber;
		this.sharp = sharp;
	}

	render() {
		return this.sharp.toBuffer();
	}
}
