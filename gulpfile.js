const gulp = require('gulp');
const uglify = require('gulp-uglify');
const typescript = require('gulp-typescript');
const ttypescript = require('ttypescript');
const { createMinifier } = require('dts-minify');
const tsMinifier = createMinifier(ttypescript);
const glob = require('glob');
const fs = require('fs');

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
		new Promise((resolve, reject) => {
			glob('dist/**/*.d.ts', (err, files) => {
				if (err) return reject(err);

				files.forEach((file) => {
					const content = fs.readFileSync(file).toString();
					const minified = tsMinifier.minify(content);

					fs.writeFileSync(file, minified);
				});

				resolve();
			});
		})
);

gulp.task('default', gulp.series('build', 'minify:ts', 'minify:dts'));
