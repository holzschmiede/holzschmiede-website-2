const gulp = require('gulp');
const ftp = require('vinyl-ftp');
const gutil = require('gulp-util');
const uncss = require('gulp-uncss');
const critical = require('critical').stream;
const fingerprint = require("gulp-md5-plus");
const runSequence = require('run-sequence');
const gReplace = require('gulp-replace');
const uuid = require('node-uuid');
const cheerio = require('gulp-cheerio');
const SftpClient = require('ssh2-sftp-client');
const gulpSftp = require('gulp-sftp');

//
// variables
//
const localBuildDir = './build';
const remotePath = '/holzschmiede';
const remoteGlob = remotePath + '/**/*';
const sftp = new SftpClient();

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
	    .pipe(fingerprint(0,'build/**/*.html'))
        .on('error', function(err) { gutil.log(gutil.colors.red(err.message)); })
	    .pipe(gulp.dest('build/assets/css/'));
});

gulp.task('optimize', function(callback) {
    runSequence('remove-dead-css', 'inline-critical-css', 'fingerprint-css', callback);
});

// deployment
gulp.task('upload', function() {
    return gulp.src([
        localBuildDir + '/**/*', 
        localBuildDir + '/.htaccess'
    ], {
        base: localBuildDir, 
        buffer: false
    })
    .pipe(gulpSftp({
        host: process.env.FTP_HOST,
        port: process.env.FTP_PORT,
        user: process.env.FTP_USER,
        pass: process.env.FTP_PASSWORD,
        remotePath: remotePath
    }));
});

gulp.task('remove-dir', function (cb) {
    return sftp.connect({
        host: process.env.FTP_HOST,
        port: process.env.FTP_PORT,
        user: process.env.FTP_USER,
        password: process.env.FTP_PASSWORD
    }).then(() => {
        return sftp.rmdir(remotePath, true);
    }).then((msg) => {
        console.log('remove-dir task reports: ', msg);
    }).then(() => {
        sftp.end(); // TODO: upgrade to node 10 so finally can be used instead
    }).catch((err) => {
        console.log('error occured in remove-dir: ', err);
    });
});

gulp.task('deploy', function(callback) {
    runSequence('remove-dir', 'upload', callback);
});