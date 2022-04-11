import gm from 'gm';

export default async function parseBuffer(
	buffer: Buffer,
	coalesce: boolean = false
) {
	if (!coalesce) return buffer;

	// Coalesce the input GIF
	return await new Promise<Buffer>((resolve, reject) => {
		gm(buffer)
			.coalesce()
			.toBuffer((error, buffer) => {
				if (error)
					reject(
						new Error(
							`There was an error during coalescing: ${error}. Reverting buffer to file buffer!`
						)
					);
				else resolve(buffer);
			});
	});
}
