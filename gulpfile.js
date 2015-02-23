var gulp = require('gulp');
var rename = require('gulp-rename');
var uglify = require('gulp-uglifyjs');
var stylus = require('gulp-stylus');
var ngAnnotate = require('gulp-ng-annotate');
var nib = require('nib');


var config;

gulp.task('stylus', stylusTask);
gulp.task('js', jsTask);
gulp.task('watch', watchTask);
gulp.task('build', ['stylus', 'js']);
gulp.task('default', ['build', 'watch']);

function stylusTask() {
    gulp.src('./src/nz-tour.styl')
        .pipe(stylus({
            use: [nib()],
            compress: false,
        }))
        .pipe(rename("nz-tour.css"))
        .pipe(gulp.dest('./dist/'));

    return gulp.src('./src/nz-tour.styl')
        .pipe(stylus({
            use: [nib()],
            compress: true,
        }))
        .pipe(rename("nz-tour.min.css"))
        .pipe(gulp.dest('./dist/'));
}

function jsTask() {
    gulp.src('./src/nz-tour.js')
        .pipe(ngAnnotate())
        .pipe(uglify())
        .pipe(rename('nz-tour.min.js'))
        .pipe(gulp.dest('./dist/'));

    return gulp.src('./src/nz-tour.js')
        .pipe(ngAnnotate())
        .pipe(gulp.dest('./dist/'));
}

function watchTask() {
    gulp.watch('./src/**', ['build']);
}
