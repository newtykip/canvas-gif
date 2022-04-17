import { performance } from 'perf_hooks';
import Gif from '../src';
import fs from 'fs';
import path from 'path';

const pfp = fs.readFileSync(path.resolve(__dirname, 'joker.jpg'));
const dog = fs.readFileSync(path.resolve(__dirname, 'dog.png'));
const startTime = performance.now();

async function doStuff() {
	const gif = new Gif(400, 400, 30);

	const options = {
		width: 100,
		height: 100,
		includedFrames: [
			{
				from: 5,
				to: 10,
			},
			{
				from: 50,
				to: 55,
			},
		],
	};

	await gif.drawImage(pfp, 10, 10, {
		// round: true,
		border: {
			thickness: 7,
			colour: '#FF0000',
		},
		...options,
	});

	await gif.drawImage(dog, 200, 10, options);

	const result = await gif.render();
	const endTime = performance.now();
	console.log(`Finished in ${endTime - startTime}ms!`);

	fs.writeFileSync(path.resolve(__dirname, 'drawImage.gif'), result);
}

doStuff();
