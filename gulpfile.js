const gulp = require('gulp');
const ts = require('gulp-typescript');
const tsc = require('typescript');
const runSequence = require('run-sequence');
const del = require('del');
const ava = require('gulp-ava');

const project = ts.createProject('./tsconfig.json', {typescript: tsc});

gulp.task('ts', () => project.src().pipe(project()).pipe(gulp.dest('./lib/')));

gulp.task('test', () => gulp.src('src/**/*.test.js').pipe(ava()));

gulp.task('watch', () => {
	gulp.watch('src/**/*.ts', ['ts', 'json']);
	gulp.watch(['src/**/*.test.js', 'lib/**/*.js'], ['test']);
	gulp.watch(['src/rules/**/*.json'], ['ts', 'json']);
});

gulp.task('json', (cb) => gulp.src('src/rules/**/*.json').pipe(gulp.dest('lib/rules/')));

gulp.task('docs', (cb) => gulp.src('src/rules/**/*.md').pipe(gulp.dest('lib/rules/')));

gulp.task('clean', (cb) => del(['lib/**/*'], cb));

gulp.task('build', (cb) => runSequence('clean', 'ts', ['docs', 'json'], cb));

gulp.task('default', ['build']);
