const gulp = require('gulp');
const ftp = require('vinyl-ftp');
const gutil = require('gulp-util');

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
gulp.task('upload', function() {
    return gulp.src(buildDirGlob, {base: localBuildDir, buffer: false})
        .pipe(conn.newerOrDifferentSize(remotePath))
        .pipe(conn.dest(remotePath));
});

gulp.task('remove-dir', function (cb) {
    conn.rmdir(remotePath, cb);
});

gulp.task('deploy', ['remove-dir', 'upload']);