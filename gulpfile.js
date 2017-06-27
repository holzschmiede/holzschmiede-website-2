const gulp = require('gulp');
const ftp = require('vinyl-ftp');
const gutil = require('gulp-util');
const uncss = require('gulp-uncss');
const critical = require('critical').stream;
const fingerpint = require("gulp-md5-plus");
const runSequence = require('run-sequence');

//
// variables
//
const localBuildDir = './build';
const buildDirGlob = localBuildDir + '/**/*';
const remotePath = '/holzschmiede/';
const remoteGlob = remotePath + '/**/*';

const conn = ftp.create({
    host: process.env.FTP_HOST,
    port: process.env.FTP_PORT,
    user: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
    parallel  : 1,
    log: gutil.log,
    //debug: console.log.bind(console)
});

//
// tasks
//

// optimization
gulp.task('remove-dead-css', function() {
    return gulp.src([
            'build/assets/css/holzschmiede-prod.css'
        ])
        .pipe(uncss({
            html: [
            'build/*.html',
            'build/**/*.html'
            ]
        }))
        .pipe(gulp.dest('build/assets/css/'));
});

gulp.task('inline-critical-css', function() {
    return gulp.src('./build/**/*.html')
        .pipe(critical({
            base: './build/', 
            inline: true,
            minify: true,
            height: 900,
            timeout: 60000, 
            css: ['./build/assets/css/holzschmiede-prod.css']
        }))
        .on('error', function(err) { gutil.log(gutil.colors.red(err.message)); })
        .pipe(gulp.dest('./build/'));
});

gulp.task('fingerprint-css', function() {
    return gulp.src('build/assets/css/holzschmiede-prod.css')
	    .pipe(fingerpint(0,'build/**/*.html'))
        .on('error', function(err) { gutil.log(gutil.colors.red(err.message)); })
	    .pipe(gulp.dest('build/assets/css/'));
});

gulp.task('optimize', function(callback) {
    runSequence('remove-dead-css', 'inline-critical-css', 'fingerprint-css', callback);
});

// deployment
gulp.task('upload', function() {
    return gulp.src(buildDirGlob, {base: localBuildDir, buffer: false})
        .pipe(conn.newerOrDifferentSize(remotePath))
        .pipe(conn.dest(remotePath));
});

gulp.task('remove-dir', function (cb) {
    conn.rmdir(remotePath, cb);
});

gulp.task('deploy', ['remove-dir', 'upload']);