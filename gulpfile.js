const gulp = require('gulp');
const ftp = require('vinyl-ftp');
const gutil = require('gulp-util');

//
// variables
//
const conn = ftp.create({
    host: process.env.FTP_HOST,
    port: process.env.FTP_PORT,
    user: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
    parallel  : 1,
    log: gutil.log
});

const localBuildDir = './build'
const buildDirGlob = localBuildDir + '/**/*'
const remotePath = '/';
const remoteGlob = remotePath + '**'

//
// tasks
//
gulp.task('deploy', function() {
    return gulp.src(buildDirGlob, {base: localBuildDir, buffer: false})
        .pipe(conn.newerOrDifferentSize(remotePath))
        .pipe(conn.dest(remotePath))
        .pipe(conn.clean(remoteGlob, localBuildDir, {base: "/"}));
});
