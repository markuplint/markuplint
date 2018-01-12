const gulp = require('gulp');
const ts = require('gulp-typescript');
const tsc = require('typescript');
const del = require('del');
const ava = require('gulp-ava');

const project = ts.createProject('./tsconfig.json', {typescript: tsc});

gulp.task('ts', () => project.src().pipe(project()).pipe(gulp.dest('./lib/')));

gulp.task('test', () => gulp.src('src/**/*.test.js').pipe(ava()));

gulp.task('json', () => gulp.src('src/rules/**/*.json').pipe(gulp.dest('lib/rules/')));

gulp.task('docs', () => gulp.src('src/rules/**/*.md').pipe(gulp.dest('lib/rules/')));

gulp.task('clean', () => del(['lib/**/*']));

gulp.task('watch', () => {
	gulp.watch('src/**/*.ts', gulp.parallel('ts', 'json'));
	gulp.watch(['src/**/*.test.js', 'lib/**/*.js'], gulp.parallel('test'));
	gulp.watch(['src/rules/**/*.json'], gulp.parallel('ts', 'json'));
});

gulp.task('build', gulp.series('clean', gulp.parallel('ts', 'docs', 'json'), 'test'));

