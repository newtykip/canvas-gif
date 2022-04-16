const gulp = require('gulp');
const uglify = require('gulp-uglify');
const typescript = require('gulp-typescript');
const ttypescript = require('ttypescript');
const { createMinifier } = require('dts-minify');
const tsMinifier = createMinifier(ttypescript);
const glob = require('tiny-glob');
const fs = require('fs');
const rimraf = require('rimraf');

gulp.task(
	'clean',
	() =>
		new Promise((resolve, reject) =>
			rimraf('dist', {}, (err) => (err ? reject(err) : resolve()))
		)
);

gulp.task('build', () => {
	const tsc = typescript.createProject('tsconfig.json', {
		typescript: ttypescript,
	});

	return gulp.src('src/**/*.ts').pipe(tsc()).pipe(gulp.dest('dist'));
});

gulp.task('minify:ts', () => {
	return gulp.src('dist/**/*.js').pipe(uglify()).pipe(gulp.dest('dist'));
});

gulp.task(
	'minify:dts',
	() =>
		new Promise(async (resolve) => {
			const toDelete = ['dist/decodeGif.d.ts', 'dist/chunk.d.ts'];
			const files = (await glob('dist/**/*.d.ts')).filter(
				(file) => !toDelete.includes(file)
			);

			files.forEach((file) => {
				const content = fs.readFileSync(file).toString();
				const minified = tsMinifier.minify(content);

				fs.writeFileSync(file, minified);
			});

			toDelete.forEach((file) => fs.rmSync(file));

			resolve();
		})
);

gulp.task('default', gulp.series('clean', 'build', 'minify:ts', 'minify:dts'));
