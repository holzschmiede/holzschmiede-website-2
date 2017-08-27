const gulp = require('gulp');
const ftp = require('vinyl-ftp');
const gutil = require('gulp-util');
const uncss = require('gulp-uncss');
const critical = require('critical').stream;
const fingerpint = require("gulp-md5-plus");
const runSequence = require('run-sequence');
const gReplace = require('gulp-replace');
const uuid = require('node-uuid');
const cheerio = require('gulp-cheerio');

//
// variables
//
const localBuildDir = './build';
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

const scriptNonce2 = uuid.v4();

gulp.task('insert-csp-nonce', function() {
    const styleNonce = uuid.v4();
    const scriptNonce = uuid.v4();

    const htmlStyleReplacement = '<style nonce="' + styleNonce +  '" type="text/css">';
    const htmlScriptReplacement = '<script nonce="' + scriptNonce + '">!';

    // feels dirty in case more scripts are added to the site. solution in 'critical' lib would be better.
    const htmlStyleReplacer = gReplace('<style type="text/css">', htmlStyleReplacement);
    const htmlScriptReplacer = gReplace('<script>!', htmlScriptReplacement);

    const htaccessStyleNonceReplacer = gReplace('[RANDOM_FOR_STYLE]', styleNonce);
    const htaccessScriptNonceReplacer = gReplace('[RANDOM_FOR_SCRIPT]', scriptNonce);
    const htaccessScriptNonceReplacer2 = gReplace('[RANDOM_FOR_SCRIPT_2]', scriptNonce2);

    return gulp.src(['./build/**/*.html', './build/.htaccess'])
	    .pipe(htmlStyleReplacer)
        .on('error', function(err) { gutil.log(gutil.colors.red(err.message)); })
        .pipe(htmlScriptReplacer)
        .on('error', function(err) { gutil.log(gutil.colors.red(err.message)); })
        .pipe(htaccessStyleNonceReplacer)
        .on('error', function(err) { gutil.log(gutil.colors.red(err.message)); })
        .pipe(htaccessScriptNonceReplacer)
        .on('error', function(err) { gutil.log(gutil.colors.red(err.message)); })
        .pipe(htaccessScriptNonceReplacer2)
        .on('error', function(err) { gutil.log(gutil.colors.red(err.message)); })      
        .pipe(gulp.dest('./build/'));
});

gulp.task('insert-csp-nonce-cheerio', function() {
    return gulp.src(['./build/**/*.html'])     
        .pipe(cheerio(function ($, file) {
            $('link[rel="preload"]').attr('nonce', scriptNonce2);
        }))
        .on('error', function(err) { gutil.log(gutil.colors.red(err.message)); })
        .pipe(gulp.dest('./build/'));
});

gulp.task('optimize', function(callback) {
    runSequence('remove-dead-css', 'inline-critical-css', 'fingerprint-css', 'insert-csp-nonce', 'insert-csp-nonce-cheerio', callback);
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
        .pipe(conn.newerOrDifferentSize(remotePath))
        .pipe(conn.dest(remotePath));
});

gulp.task('remove-dir', function (cb) {
    conn.rmdir(remotePath, cb);
});

gulp.task('deploy', function(callback) {
    runSequence('remove-dir', 'upload', callback);
});