var gulp = require('gulp'),
    ts = require('gulp-typescript'),
    es = require('event-stream'),
    cordovaBuild = require('taco-team-build');
var gutil = require('gulp-util');
var bower = require('bower');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var sh = require('shelljs');
var inquirer = require('inquirer');
var change = require('gulp-change');
var q = require('q');
var fs = require('fs');
var glob = require('glob');
var zip = require('gulp-zip');
var unzip = require('gulp-unzip');
var request = require('request');
var open = require('gulp-open');
var gcallback = require('gulp-callback');
var runSequence = require('run-sequence');
var plist = require('plist');
var xml2js = require('xml2js');
var parseString = require('xml2js').parseString;
var clean = require('gulp-rimraf');
var replace = require('gulp-string-replace');
var download = require('gulp-download-stream');
var git = require('gulp-git'),
    jeditor = require('gulp-json-editor'),
    source = require('vinyl-source-stream'),
    streamify = require('gulp-streamify');
var directoryMap = require('gulp-directory-map');
var argv = require('yargs').argv;
var exec = require('child_process').exec;
var rp = require('request-promise');
var templateCache = require('gulp-angular-templatecache');
var uglify      = require('gulp-uglify');
var rev = require('gulp-rev');
var revReplace = require('gulp-rev-replace');
var useref = require('gulp-useref');
var filter = require('gulp-filter');
var csso = require('gulp-csso');

var bugsnag = require("bugsnag");
bugsnag.register("ae7bc49d1285848342342bb5c321a2cf");
bugsnag.releaseStage = getCurrentServerContext();
process.on('unhandledRejection', function (err, promise) {
    console.error("Unhandled rejection: " + (err && err.stack || err));
    bugsnag.notify(err);
});
bugsnag.onBeforeNotify(function (notification) {
    var metaData = notification.events[0].metaData;
    // modify meta-data
    metaData.subsystem = { name: getCurrentServerContext() };
    metaData.client_id = process.env.QUANTIMODO_CLIENT_ID;
    metaData.build_link = getBuildLink();
});

var Quantimodo = require('quantimodo');
var defaultClient = Quantimodo.ApiClient.instance;
var quantimodo_oauth2 = defaultClient.authentications['quantimodo_oauth2'];
quantimodo_oauth2.accessToken = process.env.QUANTIMODO_ACCESS_TOKEN;



var s3 = require('gulp-s3-upload')({accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY});
console.log("process.platform is " + process.platform + " and process.env.OS is " + process.env.OS);
function isTruthy(value) {return (value && value !== "false");}
var buildDebug = isTruthy(process.env.BUILD_DEBUG || process.env.DEBUG_BUILD);
logInfo("Environmental Variables:", process.env);
function getCurrentServerContext() {
    var currentServerContext = "local";
    if(process.env.CIRCLE_BRANCH){return "circleci";}
    if(process.env.BUDDYBUILD_BRANCH){return "buddybuild";}
    return process.env.HOSTNAME;
}
function getBuildLink() {
    if(process.env.BUDDYBUILD_APP_ID){return "https://dashboard.buddybuild.com/apps/" + process.env.BUDDYBUILD_APP_ID + "/build/" + process.env.BUDDYBUILD_APP_ID;}
    if(process.env.CIRCLE_BUILD_NUM){return "https://circleci.com/gh/QuantiModo/quantimodo-android-chrome-ios-web-app/" + process.env.CIRCLE_BUILD_NUM;}
}
function setClientId(callback) {
    if(process.env.QUANTIMODO_CLIENT_ID){
        logInfo('Client id already set to ' + process.env.QUANTIMODO_CLIENT_ID);
        if (callback) {callback();}
        return;
    }
    if(process.env.BUDDYBUILD_BRANCH && process.env.BUDDYBUILD_BRANCH.indexOf('apps') !== -1){
        process.env.QUANTIMODO_CLIENT_ID = process.env.BUDDYBUILD_BRANCH.replace('apps/', '');
    }
    if(process.env.CIRCLE_BRANCH && process.env.CIRCLE_BRANCH.indexOf('apps') !== -1){
        process.env.QUANTIMODO_CLIENT_ID = process.env.CIRCLE_BRANCH.replace('apps/', '');
        logInfo("Using CIRCLE_BRANCH as client id: " + process.env.CIRCLE_BRANCH);
    }
    if(argv.clientId){
        process.env.QUANTIMODO_CLIENT_ID = argv.clientId;
        logInfo("Using argv.clientId as client id: " + argv.clientId);
    }
    if(process.env.QUANTIMODO_CLIENT_ID){
        process.env.QUANTIMODO_CLIENT_ID = process.env.QUANTIMODO_CLIENT_ID.replace('apps/', '');
        logInfo('Stripped apps/ and now client id is ' + process.env.QUANTIMODO_CLIENT_ID);
    }
    if (!process.env.QUANTIMODO_CLIENT_ID) {
        git.revParse({args: '--abbrev-ref HEAD'}, function (err, branch) {
            logInfo('current git branch: ' + branch);
            if (!process.env.QUANTIMODO_CLIENT_ID) {
                if (appIds[branch]) {
                    logInfo('Setting process.env.QUANTIMODO_CLIENT_ID using branch name ' + branch);
                    process.env.QUANTIMODO_CLIENT_ID = branch;
                } else {
                    console.warn('No process.env.QUANTIMODO_CLIENT_ID set.  Falling back to quantimodo client id');
                    process.env.QUANTIMODO_CLIENT_ID = 'quantimodo';
                }
            }
            if (callback) {callback();}
        });
    } else {
        if (callback) {callback();}
    }
}
//setClientId();  // Don't want to do this here because it's logs interrupt dev credential entry
var appIds = {
    'moodimodo': 'homaagppbekhjkalcndpojiagijaiefm',
    'mindfirst': 'jeadacoeabffebaeikfdpjgpjbjinobl',
    'energymodo': 'aibgaobhplpnjmcnnmdamabfjnbgflob',
    'quantimodo': true,
    'medimodo': true
};
var pathToIcons = "www/img/icons";
var appHostName = (process.env.APP_HOST_NAME) ? process.env.APP_HOST_NAME : "https://app.quantimo.do";
var appSettings, privateConfig, devCredentials;
var privateConfigDirectoryPath = 'www/private_configs/';
var appConfigDirectoryPath = 'www/configs/';
var defaultPrivateConfigPath = privateConfigDirectoryPath + 'default.private_config.json';
var devCredentialsPath = privateConfigDirectoryPath + 'dev-credentials.json';
var defaultAppConfigPath = appConfigDirectoryPath + 'default.config.json';
var pathToOutputApks = 'platforms/android/build/outputs/apk';
var pathToCombinedReleaseApk = pathToOutputApks + '/android-release.apk';
var androidArm7ReleaseApkName = 'android-armv7-release';
var pathToReleaseArmv7Apk = pathToOutputApks + '/' + androidArm7ReleaseApkName + '.apk';
var androidX86ReleaseApkName = 'android-x86-release';
var pathToReleasex86Apk = pathToOutputApks + '/' + androidX86ReleaseApkName + '.apk';
var androidArm7DebugApkName = 'android-armv7-debug';
var pathToDebugArmv7Apk = pathToOutputApks + '/' + androidArm7DebugApkName + '.apk';
var androidX86DebugApkName = 'android-x86-debug';
var pathToDebugx86Apk = pathToOutputApks + '/' + androidX86DebugApkName + '.apk';
var buildPath = 'build';
var circleCIPathToRepo = '~/quantimodo-android-chrome-ios-web-app';
var chromeExtensionBuildPath = buildPath + '/chrome_extension';
var platformCurrentlyBuildingFor;
var s3BaseUrl = 'https://quantimodo.s3.amazonaws.com/';
var majorMinorVersionNumbers = '2.7.';
var date = new Date();
var paths = {
    sass: ['./src/scss/**/*.scss']
};
if(argv.clientSecret){process.env.QUANTIMODO_CLIENT_SECRET = argv.clientSecret;}
function getChromeExtensionZipFilename() {return process.env.QUANTIMODO_CLIENT_ID + '-chrome-extension.zip';}
function getPathToChromeExtensionZip() {return buildPath + '/' + getChromeExtensionZipFilename();}
function getPathToUnzippedChromeExtension() {return buildPath + '/' + process.env.QUANTIMODO_CLIENT_ID + '-chrome-extension';}
function getPatchVersionNumber() {
    var date = new Date();
    var monthNumber = (date.getMonth() + 1).toString();
    var dayOfMonth = ('0' + date.getDate()).slice(-2);
    return monthNumber + dayOfMonth;
}
function appendLeadingZero(integer) {
    return ('0' + integer).slice(-2);
}
function getLongDateFormat(){
    return date.getFullYear().toString() + appendLeadingZero(date.getMonth() + 1) + appendLeadingZero(date.getDate());
}
var versionNumbers = {
    iosCFBundleVersion: majorMinorVersionNumbers + getPatchVersionNumber() + '.0',
    //androidVersionCodes: {armV7: getLongDateFormat() + appendLeadingZero(date.getHours()), x86: getLongDateFormat() + appendLeadingZero(date.getHours() + 1)},
    androidVersionCode: getLongDateFormat() + appendLeadingZero(date.getHours()),
    ionicApp: majorMinorVersionNumbers + getPatchVersionNumber()
};
logInfo(JSON.stringify(versionNumbers));
function readDevCredentials(){
    try{
        devCredentials = JSON.parse(fs.readFileSync(devCredentialsPath));
        logInfo("Using dev credentials from " + devCredentialsPath + ". This file is ignored in .gitignore and should never be committed to any repository.");
    } catch (error){
        logInfo('No existing dev credentials found');
        devCredentials = {};
    }
}
function validateJsonFile(filePath) {
    try{
        var parsedOutput = JSON.parse(fs.readFileSync(filePath));
        logInfo(filePath + " is valid json");
        logDebug(filePath + ": ", parsedOutput);
    } catch (error){
        var message = filePath + " is NOT valid json!";
        logError(message, error);
        throw(message);
    }
}
readDevCredentials();
function convertToCamelCase(string) {
    string = string.replace('.', '-');
    string = string.replace('_', '-');
    if(string.charAt(0) === "-"){string = string.substr(1);}
    string = string.replace(/(\_[a-z])/g, function($1){return $1.toUpperCase().replace('_','');});
    string = string.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
    return string;
}
function getSubStringAfterLastSlash(myString) {
    var parts = myString.split('/');
    return parts[parts.length - 1];
}
function convertFilePathToPropertyName(filePath) {
    var propertyName = getSubStringAfterLastSlash(filePath);
    propertyName = propertyName.replace(process.env.QUANTIMODO_CLIENT_ID, '');
    propertyName = propertyName.replace('.zip', '').replace('.apk', '');
    propertyName = convertToCamelCase(propertyName);
    return propertyName;
}
function getS3RelativePath(relative_filename) {
    return  'app_uploads/' + process.env.QUANTIMODO_CLIENT_ID + '/' + relative_filename;
}
function getS3Url(relative_filename) {
    return s3BaseUrl + getS3RelativePath(relative_filename);
}
function uploadBuildToS3(filePath) {
    if(appSettings.apiUrl === "local.quantimo.do"){
        logInfo("Not uploading because appSettings.apiUrl is " + appSettings.apiUrl);
        return;
    }
    /** @namespace appSettings.appStatus.betaDownloadLinks */
    appSettings.appStatus.betaDownloadLinks[convertFilePathToPropertyName(filePath)] = getS3Url(filePath);
    /** @namespace appSettings.appStatus.buildStatus */
    appSettings.appStatus.buildStatus[convertFilePathToPropertyName(filePath)] = "READY";
    return uploadToS3(filePath);
}
function uploadAppImagesToS3(filePath) {
    //appSettings.additionalSettings.appImages[convertFilePathToPropertyName(filePath)] = getS3Url(filePath); We can just generate this from client id in PHP contructor
    return uploadToS3(filePath);
}
function uploadToS3(filePath) {
    if(!process.env.AWS_ACCESS_KEY_ID){
        logInfo("Cannot upload to S3. Please set environmental variable AWS_ACCESS_KEY_ID");
        return;
    }
    if(!process.env.AWS_SECRET_ACCESS_KEY){
        logInfo("Cannot upload to S3. Please set environmental variable AWS_SECRET_ACCESS_KEY");
        return;
    }
    logInfo("Uploading " + filePath);
    return gulp.src([filePath]).pipe(s3({
        Bucket: 'quantimodo',
        ACL: 'public-read',
        keyTransform: function(relative_filename) {
            return getS3RelativePath(filePath);
        }
    }, {
        maxRetries: 5,
        logger: console
    }));
}
function prettyJSONStringify(object) {return JSON.stringify(object, null, '\t');}
function execute(command, callback) {
    logDebug('executing ' + command);
    var my_child_process = exec(command, function (error, stdout, stderr) {
        if (error !== null) {logError('ERROR: exec ' + error);}
        callback(error, stdout);
    });
    my_child_process.stdout.pipe(process.stdout);
    my_child_process.stderr.pipe(process.stderr);
}
function executeCommand(command, callback) {
    exec(command, function (err, stdout, stderr) {
        logInfo(stdout);
        logInfo(stderr);
        callback(err);
    });
}
function decryptFile(fileToDecryptPath, decryptedFilePath, callback) {
    if (!process.env.ENCRYPTION_SECRET) {
        logError('ERROR: Please set ENCRYPTION_SECRET environmental variable!');
        if (callback) {callback();}
        return;
    }
    logInfo('DECRYPTING ' + fileToDecryptPath + ' to ' + decryptedFilePath);
    var cmd = 'openssl aes-256-cbc -k "' + process.env.ENCRYPTION_SECRET + '" -in "' + fileToDecryptPath + '" -d -a -out "' + decryptedFilePath + '"';
    execute(cmd, function (error) {
        if (error !== null) {logError('ERROR: DECRYPTING: ' + error);} else {logInfo('DECRYPTED to ' + decryptedFilePath);}
        fs.stat(decryptedFilePath, function (err, stat) {
            if (!err) {
                logInfo(decryptedFilePath + ' exists');
            } else {
                logError('Could not decrypt' + fileToDecryptPath);
                logError('Make sure openssl works on your command line and the bin folder is in your PATH env: https://code.google.com/archive/p/openssl-for-windows/downloads');
                logError(err);
            }
        });
        if (callback) {callback();}
        //outputSHA1ForAndroidKeystore(decryptedFilePath);
    });
}
function encryptFile(fileToEncryptPath, encryptedFilePath, callback) {
    if (!process.env.ENCRYPTION_SECRET) {
        logError('ERROR: Please set ENCRYPTION_SECRET environmental variable!');
        return;
    }
    var cmd = 'openssl aes-256-cbc -k "' + process.env.ENCRYPTION_SECRET + '" -in "' + fileToEncryptPath + '" -e -a -out "' + encryptedFilePath + '"';
    logDebug('executing ' + cmd);
    execute(cmd, callback);
}
function encryptPrivateConfig(callback) {
    var encryptedFilePath = privateConfigDirectoryPath + process.env.QUANTIMODO_CLIENT_ID + '.private_config.json.enc';
    var fileToEncryptPath = privateConfigDirectoryPath + process.env.QUANTIMODO_CLIENT_ID + '.private_config.json';
    encryptFile(fileToEncryptPath, encryptedFilePath, callback);
}
function ionicUpload(callback) {
    var commandForGit = 'git log -1 HEAD --pretty=format:%s';
    execute(commandForGit, function (error, output) {
        var commitMessage = output.trim();
        var uploadCommand = 'ionic upload --email m@thinkbnumbers.org --password ' + process.env.IONIC_PASSWORD +
            ' --note "' + commitMessage + '" --deploy ' + process.env.RELEASE_STAGE;
        logInfo('ionic upload --note "' + commitMessage + '" --deploy ' + process.env.RELEASE_STAGE);
        logDebug('\n' + uploadCommand);
        execute(uploadCommand, callback);
    });
}
function zipAFolder(folderPath, zipFileName, destinationFolder) {
    logInfo("Zipping " + folderPath + " to " + destinationFolder + '/' + zipFileName);
    logDebug('If this fails, make sure there are no symlinks.');
    return gulp.src([folderPath + '/**/*'])
        .pipe(zip(zipFileName))
        .pipe(gulp.dest(destinationFolder));
}
function resizeIcon(callback, resolution) {
    var outputIconPath = pathToIcons + '/icon_' + resolution + '.png';
    var command = 'convert resources/icon.png -resize ' + resolution + 'x' + resolution + ' ' + outputIconPath;
    return execute(command, function (error) {
        if (error) {
            logInfo("Please install imagemagick in order to resize icons.  The windows version is here: https://sourceforge.net/projects/imagemagick/?source=typ_redirect");
            logInfo('ERROR: ' + JSON.stringify(error));
        }
        uploadAppImagesToS3(outputIconPath);
        callback();
    });
}
function onWindows(callback) {
    if(process.env.OS && process.env.OS.toLowerCase().indexOf('win') !== -1){
        logInfo("Cannot do this on windows");
        if(callback){callback();}
        return true;
    }
}
function fastlaneSupply(track, callback) {
    if(onWindows(callback)){return;}
    var apk_paths;
    logInfo("If you have problems uploading to Play, promote any alpha releases to beta, disable the alpha channel, and set xwalkMultipleApk to false");
    /** @namespace appSettings.additionalSettings */
    /** @namespace buildSettings.xwalkMultipleApk */
    if(buildSettings.xwalkMultipleApk) {
        apk_paths = pathToReleaseArmv7Apk + ',' + pathToReleasex86Apk;
    } else {
        apk_paths = pathToCombinedReleaseApk;
    }
    /** @namespace appSettings.additionalSettings.appIds.appIdentifier */
    /** @namespace appSettings.additionalSettings.appIds */
    executeCommand('fastlane supply' +
        ' --apk_paths ' + apk_paths +
        ' --track ' + track +
        ' --skip_upload_metadata ' +
        ' --skip_upload_images ' +
        ' --skip_upload_screenshots ' +
        ' --verbose ' +
        ' --package_name ' + appSettings.additionalSettings.appIds.appIdentifier +
        ' --json_key supply_json_key_for_google_play.json',
        callback);
}
function setVersionNumbersInWidget(parsedXmlFile) {
    parsedXmlFile.widget.$.version = versionNumbers.ionicApp;
    parsedXmlFile.widget.$['ios-CFBundleVersion'] = versionNumbers.iosCFBundleVersion;
    parsedXmlFile.widget.$['android-versionCode'] = versionNumbers.androidVersionCode;
    return parsedXmlFile;
}
function getPostRequestOptions() {
    var options = getRequestOptions('/api/v1/appSettings');
    options.method = "POST";
    options.body = {clientId: process.env.QUANTIMODO_CLIENT_ID};
    return options;
}
function obfuscateSecrets(object){
    if(typeof object !== 'object'){return object;}
    object = JSON.parse(JSON.stringify(object)); // Decouple so we don't screw up original object
    for (var propertyName in object) {
        if (object.hasOwnProperty(propertyName)) {
            var lowerCaseProperty = propertyName.toLowerCase();
            if(lowerCaseProperty.indexOf('secret') !== -1 || lowerCaseProperty.indexOf('password') !== -1 || lowerCaseProperty.indexOf('token') !== -1){
                object[propertyName] = "HIDDEN";
            } else {
                object[propertyName] = obfuscateSecrets(object[propertyName]);
            }
        }
    }
    return object;
}
function obfuscateStringify(message, object) {
    var objectString = '';
    if(object){
        object = obfuscateSecrets(object);
        objectString = ':  ' + prettyJSONStringify(object);
    }
    message += objectString;
    if(process.env.QUANTIMODO_CLIENT_SECRET){message = message.replace(process.env.QUANTIMODO_CLIENT_SECRET, 'HIDDEN');}
    if(process.env.AWS_SECRET_ACCESS_KEY){message = message.replace(process.env.AWS_SECRET_ACCESS_KEY, 'HIDDEN');}
    if(process.env.ENCRYPTION_SECRET){message = message.replace(process.env.ENCRYPTION_SECRET, 'HIDDEN');}
    if(process.env.QUANTIMODO_ACCESS_TOKEN){message = message.replace(process.env.QUANTIMODO_ACCESS_TOKEN, 'HIDDEN');}
    return message;
}
function logDebug(message, object) {if(buildDebug){logInfo(message, object);}}
function logInfo(message, object) {console.log(obfuscateStringify(message, object));}
function logError(message, object) {
    console.error(obfuscateStringify(message, object));
    bugsnag.notify(new Error(obfuscateStringify(message), obfuscateSecrets(object)));
}
function postAppStatus() {
    var options = getPostRequestOptions();
    options.body.appStatus = appSettings.appStatus;
    logInfo("Posting appStatus", appSettings.appStatus);
    return makeApiRequest(options);
}
function makeApiRequest(options, successHandler) {
    logInfo('Making request to ' + options.uri + ' with clientId: ' + process.env.QUANTIMODO_CLIENT_ID);
    logDebug(options.uri, options);
    return rp(options).then(function (response) {
        logInfo("Successful response from " + options.uri + " for client id " + options.qs.clientId);
        logDebug(options.uri + " response", response);
        if(successHandler){successHandler(response);}
    }).catch(function (err) {
        outputApiErrorResponse(err, options);
        throw err;
    });
}
function postNotifyCollaborators(appType) {
    var options = getPostRequestOptions();
    options.uri = appHostName + '/api/v2/email';
    options.body.emailType = appType + '-build-ready';
    return makeApiRequest(options);
}
function getRequestOptions(path) {
    var options = {
        uri: appHostName + path,
        qs: {clientId: process.env.QUANTIMODO_CLIENT_ID, clientSecret: process.env.QUANTIMODO_CLIENT_SECRET},
        headers: {'User-Agent': 'Request-Promise', 'Content-Type': 'application/json'},
        json: true // Automatically parses the JSON string in the response
    };
    if(process.env.QUANTIMODO_ACCESS_TOKEN){
        options.qs.access_token = process.env.QUANTIMODO_ACCESS_TOKEN;
    } else {
        logError("Please add your QUANTIMODO_ACCESS_TOKEN environmental variable from " + appHostName + "/api/v2/account");
    }
    return options;
}
function getAppEditUrl() {
    return getAppsListUrl() + '/' + appSettings.clientId + '/edit';
}
function getAppsListUrl() {
    return appHostName + '/api/v2/apps';
}
function getAppDesignerUrl() {
    return appHostName + '/ionic/Modo/www/configuration-index.html#/app/configuration?clientId=' + appSettings.clientId;
}
function verifyExistenceOfFile(filePath) {
    return fs.stat(filePath, function (err, stat) {
        if (!err) {logInfo(filePath + ' exists');} else {throw 'Could not create ' + filePath + ': '+ err;}
    });
}
function writeToXmlFile(outputFilePath, parsedXmlFile, callback) {
    var builder = new xml2js.Builder();
    var updatedXml = builder.buildObject(parsedXmlFile);
    fs.writeFile(outputFilePath, updatedXml, 'utf8', function (error) {
        if (error) {
            logError('ERROR: error writing to xml file', error);
        } else {
            logInfo('Successfully wrote the xml file: ' + updatedXml);
            if(callback){callback();}
        }
    });
}
function replaceTextInFiles(filesArray, textToReplace, replacementText){
    return gulp.src(filesArray, {base: '.'})
        .pipe(replace(textToReplace, replacementText))
        .pipe(gulp.dest('./'));
}
function outputApiErrorResponse(err, options) {
    if(err.response.statusCode === 401){throw "Credentials invalid.  Please correct them in " + devCredentialsPath + " and try again.";}
    logError(options.uri + " error response", err.response.body);
}
function getFileNameFromUrl(url) {
    return url.split('/').pop();
}
function downloadEncryptedFile(url, outputFileName) {
    var decryptedFilename = getFileNameFromUrl(url).replace('.enc', '');
    var downloadUrl = appHostName + '/api/v2/download?client_id=' + process.env.QUANTIMODO_CLIENT_ID + '&filename=' + encodeURIComponent(url);
    logInfo("Downloading " + downloadUrl + ' to ' + decryptedFilename);
    return request(downloadUrl + '&accessToken=' + process.env.QUANTIMODO_ACCESS_TOKEN)
        .pipe(fs.createWriteStream(outputFileName));
}
function unzipFile(pathToZipFile, pathToOutputFolder) {
    logInfo("Unzipping " + pathToZipFile + " to " + pathToOutputFolder);
    return gulp.src(pathToZipFile)
        .pipe(unzip())
        .pipe(gulp.dest(pathToOutputFolder));
}
function getCordovaBuildCommand(releaseStage, platform) {
    var command = 'cordova build --' + releaseStage + ' ' + platform;
    //if(buildDebug){command += " --verbose";}  // Causes stdout maxBuffer exceeded error.  Run this as a command outside gulp if you need verbose output
    return command;
}
function outputVersionCodeForApk(pathToApk) {
    if(onWindows()){return;}
    var cmd = '$ANDROID_HOME/build-tools/24.0.2/aapt dump badging ' + circleCIPathToRepo + '/' + pathToApk;
    // aapt dump badging MyAwesomeApplication.apk |grep version
    return execute(cmd, function (error) {
        if (error !== null) {logError('ERROR: ' + error);}
    });
}
function copyFiles(sourceFiles, destinationPath) {
    console.log("Copying " + sourceFiles + " to " + destinationPath);
    return gulp.src([sourceFiles])
        .pipe(gulp.dest(destinationPath));
}
function addAppSettingsToParsedConfigXml(parsedXmlFile) {
    parsedXmlFile.widget.name[0] = appSettings.appDisplayName;
    parsedXmlFile.widget.description[0] = appSettings.appDescription;
    parsedXmlFile.widget.$.id = appSettings.additionalSettings.appIds.appIdentifier;
    parsedXmlFile.widget.preference.push({$: {name: "xwalkMultipleApk",
        value: (buildSettings.xwalkMultipleApk) ? true : false}});
    return parsedXmlFile;
}
function generateConfigXmlFromTemplate(callback) {
    //var configXmlPath = 'config-template-' + platformCurrentlyBuildingFor + '.xml';
    var configXmlPath = 'config-template-shared.xml';
    var xml = fs.readFileSync(configXmlPath, 'utf8');
    /** @namespace appSettings.additionalSettings.appIds.googleReversedClientId */
    if (appSettings.additionalSettings.appIds.googleReversedClientId) {
        xml = xml.replace('REVERSED_CLIENT_ID_PLACEHOLDER', appSettings.additionalSettings.appIds.googleReversedClientId);
    }
    parseString(xml, function (err, parsedXmlFile) {
        if (err) {
            throw new Error('ERROR: failed to read xml file', err);
        } else {
            parsedXmlFile = addAppSettingsToParsedConfigXml(parsedXmlFile);
            parsedXmlFile = setVersionNumbersInWidget(parsedXmlFile);
            writeToXmlFile('./config.xml', parsedXmlFile, callback);
        }
    });
}
// Setup platforms to build that are supported on current hardware
// See https://taco.visualstudio.com/en-us/docs/tutorial-gulp-readme/
//var winPlatforms = ["android", "windows"], //Android is having problems so I'm only building windows for now
var winPlatforms = ['windows'],
    linuxPlatforms = ['android'],
    osxPlatforms = ['ios'],
    platformsToBuild = process.platform === 'darwin' ? osxPlatforms :
        (process.platform === 'linux' ? linuxPlatforms : winPlatforms),
    // Build config to use for build - Use Pascal case to match paths set by VS
    buildConfig = 'Release',
    // Arguments for build by platform. Warning: Omit the extra "--" when referencing platform
    // specific options (Ex:"-- --gradleArg" is "--gradleArg").
    buildArgs = {
        android: ['--' + buildConfig.toLocaleLowerCase(), '--device', '--gradleArg=--no-daemon'],
        ios: ['--' + buildConfig.toLocaleLowerCase(), '--device'],
        windows: ['--' + buildConfig.toLocaleLowerCase(), '--device']
    },
    // Paths used by build
    buildPaths = {
        tsconfig: 'scripts/tsconfig.json',
        ts: './scripts/**/*.ts',
        apk: ['./platforms/android/ant-build/*.apk',
            './platforms/android/bin/*.apk',
            './platforms/android/build/outputs/apk/*.apk'],
        binApk: './bin/Android/' + buildConfig,
        ipa: ['./platforms/ios/build/device/*.ipa',
            './platforms/ios/build/device/*.app.dSYM'],
        binIpa: './bin/iOS/' + buildConfig,
        appx: './platforms/windows/AppPackages/**/*',
        binAppx: './bin/Windows/' + buildConfig
    };
// Set the default to the build task
gulp.task('default', ['configureApp']);
// Executes taks specified in winPlatforms, linuxPlatforms, or osxPlatforms based on
// the hardware Gulp is running on which are then placed in platformsToBuild
gulp.task('build', ['scripts', 'sass'], function () {
    logInfo("Be sure to setup your system following the instructions at http://taco.visualstudio.com/en-us/docs/tutorial-gulp-readme/#tacoteambuild");
    return cordovaBuild.buildProject(platformsToBuild, buildArgs)
        .then(function () {
            // ** NOTE: Package not required in recent versions of Cordova
            return cordovaBuild.packageProject(platformsToBuild)
                .then(function () {
                    return es.concat(
                        gulp.src(buildPaths.apk).pipe(gulp.dest(buildPaths.binApk)),
                        gulp.src(buildPaths.ipa).pipe(gulp.dest(buildPaths.binIpa)),
                        gulp.src(buildPaths.appx).pipe(gulp.dest(buildPaths.binAppx)));
                });
        });
});
// Build Android, copy the results back to bin folder
gulp.task('build-android', ['scripts', 'sass'], function () {
    return cordovaBuild.buildProject('android', buildArgs)
        .then(function () {
            return gulp.src(buildPaths.apk).pipe(gulp.dest(buildPaths.binApk));
        });
});
// Build iOS, copy the results back to bin folder
gulp.task('build-ios', ['scripts', 'sass'], function () {
    return cordovaBuild.buildProject('ios', buildArgs)
        .then(function () {
            // ** NOTE: Package not required in recent versions of Cordova
            return cordovaBuild.packageProject(platformsToBuild)
                .then(function () {
                    return gulp.src(buildPaths.ipa).pipe(gulp.dest(buildPaths.binIpa));
                });
        });
});
// Build Windows, copy the results back to bin folder
gulp.task('build-win', ['scripts', 'sass'], function () {
    return cordovaBuild.buildProject('windows', buildArgs)
        .then(function () {
            return gulp.src(buildPaths.appx).pipe(gulp.dest(buildPaths.binAppx));
        });
});
// Typescript compile - Can add other things like minification here
gulp.task('scripts', function () {
    // Compile TypeScript code - This sample is designed to compile anything under the "scripts" folder using settings
    // in tsconfig.json if present or this gulpfile if not.  Adjust as appropriate for your use case.
    if (fs.existsSync(buildPaths.tsconfig)) {
        // Use settings from scripts/tsconfig.json
        gulp.src(buildPaths.ts)
            .pipe(ts(ts.createProject(buildPaths.tsconfig)))
            .pipe(gulp.dest('.'));
    } else {
        // Otherwise use these default settings
        gulp.src(buildPaths.ts)
            .pipe(ts({
                noImplicitAny: false,
                noEmitOnError: true,
                removeComments: false,
                sourceMap: true,
                out: 'appBundle.js',
                target: 'es5'
            }))
            .pipe(gulp.dest('www/scripts'));
    }
});
gulp.task('copyWwwFolderToChromeExtensionAndCreateManifest', ['copyWwwFolderToChromeExtension'], function () {
    appSettings.appStatus.buildStatus.chromeExtension = "BUILDING";
    postAppStatus();
    var chromeExtensionManifest = {
        'manifest_version': 2,
        'name': appSettings.appDisplayName,
        'description': appSettings.appDescription,
        'version': versionNumbers.ionicApp,
        'options_page': 'chrome_extension/options/options.html',
        'icons': {
            '16': 'img/icons/icon_16.png',
            '48': 'img/icons/icon_48.png',
            '128': 'img/icons/icon_128.png'
        },
        'permissions': [
            'alarms',
            'notifications',
            'storage',
            'tabs',
            'https://*.google.com/*',
            'https://*.facebook.com/*',
            'https://*.quantimo.do/*',
            'https://*.uservoice.com/*',
            'https://*.googleapis.com/*',
            'https://*.intercom.com/*',
            'https://*.intercom.io/*',
            'https://*.googleapis.com/*'
        ],
        'browser_action': {
            'default_icon':  'img/icons/icon_700.png',
            'default_popup': 'chrome_default_popup_iframe.html'
        },
        'background': {
            'scripts': ['js/chrome/background.js'],
            'persistent': false
        }
    };
    //chromeExtensionManifest.appSettings = appSettings; // I think adding appSettings to the chrome manifest breaks installation
    chromeExtensionManifest = JSON.stringify(chromeExtensionManifest, null, 2);
    var chromeManifestPath = chromeExtensionBuildPath + '/manifest.json';
    logInfo("Creating chrome manifest at " + chromeManifestPath);
    writeToFile(chromeManifestPath, chromeExtensionManifest);
});
function writeToFile(filePath, stringContents) {
    logDebug("Writing to " + filePath);
    if(typeof stringContents !== "string"){stringContents = JSON.stringify(stringContents);}
    return fs.writeFileSync(filePath, stringContents);
}
gulp.task('setClientId', function (callback) {setClientId(callback);});
gulp.task('validateAndSaveDevCredentials', ['setClientId'], function () {
    var options = getRequestOptions('/api/v1/user');
    writeToFile(devCredentialsPath, JSON.stringify(devCredentials));  // TODO:  Save QUANTIMODO_ACCESS_TOKEN instead of username and password
    return makeApiRequest(options);
});
function downloadFile(url, filename, destinationFolder) {
    logInfo("Downloading  " + url + " to " + destinationFolder + "/" + filename);
    return download(url)
        .pipe(rename(filename))
        .pipe(gulp.dest(destinationFolder));
}
function downloadAndUnzipFile(url, destinationFolder) {
    logInfo("Downloading  " + url + " and uzipping to " + destinationFolder);
    return download(url)
        .pipe(unzip())
        .pipe(gulp.dest(destinationFolder));
}
gulp.task('downloadChromeExtension', [], function(){
    return downloadAndUnzipFile(appSettings.appStatus.betaDownloadLinks.chromeExtension, getPathToUnzippedChromeExtension());
});
gulp.task('downloadIcon', [], function(){
    /** @namespace appSettings.additionalSettings.appImages.appIcon */
    /** @namespace appSettings.additionalSettings.appImages */
    var iconUrl = (appSettings.additionalSettings.appImages.appIcon) ? appSettings.additionalSettings.appImages.appIcon : appSettings.iconUrl;
    return downloadFile(iconUrl, 'icon.png', "./resources");
});
gulp.task('generatePlayPublicLicenseKeyManifestJson', ['getAppConfigs'], function(){
    if(!appSettings.additionalSettings.monetizationSettings.playPublicLicenseKey){
        logError("No public licence key for Play Store subscriptions.  Please add it at  " + getAppDesignerUrl(), appSettings.additionalSettings);
        return;
    }
    var manifestJson = {
        'play_store_key': appSettings.additionalSettings.monetizationSettings.playPublicLicenseKey
    };
    /** @namespace buildSettings.playPublicLicenseKey */
    return writeToFile('./www/manifest.json', manifestJson);
});
gulp.task('downloadSplashScreen', [], function(){
    /** @namespace appSettings.additionalSettings.appImages.splashScreen */
    var splashScreen = (appSettings.additionalSettings.appImages.splashScreen) ? appSettings.additionalSettings.appImages.splashScreen : appSettings.splashScreen;
    return downloadFile(splashScreen, 'splash.png', "./resources");
});
gulp.task('mergeToMasterAndTriggerRebuildsForAllApps', [], function(){
    var options = getRequestOptions('/api/ionic/master/merge');
    options.qs.server = options.qs.currentServerConext = getCurrentServerContext();
    return makeApiRequest(options);
});
function generateDefaultConfigJson(appSettings) {
    writeToFile(defaultAppConfigPath, prettyJSONStringify(appSettings));
}
gulp.task('getAppConfigs', ['setClientId'], function () {
    if(appSettings && appSettings.clientId === process.env.QUANTIMODO_CLIENT_ID){
        logInfo("Already have appSettings for " + appSettings.clientId);
        return;
    }
    var options = getRequestOptions('/api/v1/appSettings');
    function successHandler(response) {
        appSettings = response.appSettings;
        appSettings.buildServer = getCurrentServerContext();
        appSettings.buildLink = getBuildLink();
        appSettings.versionNumber = versionNumbers.ionicApp;
        appSettings.debugMode = isTruthy(process.env.APP_DEBUG);
        buildSettings = JSON.parse(JSON.stringify(appSettings.additionalSettings.buildSettings));
        delete appSettings.additionalSettings.buildSettings;
        /** @namespace appSettings.appStatus.buildEnabled.androidArmv7Release */
        /** @namespace appSettings.appStatus.buildEnabled.androidX86Release */
        if(appSettings.appStatus.buildEnabled.androidX86Release || appSettings.appStatus.buildEnabled.androidArmv7Release){
            appSettings.appStatus.additionalSettings.buildSettings.xwalkMultipleApk = true;
        }
        logInfo("Got app settings for " + appSettings.appDisplayName + ". You can change your app settings at " + getAppEditUrl());
        //appSettings = removeCustomPropertiesFromAppSettings(appSettings);
        if(process.env.APP_HOST_NAME){appSettings.apiUrl = process.env.APP_HOST_NAME.replace("https://", '');}
        if(!response.privateConfig && devCredentials.accessToken){
            logError("Could not get privateConfig from " + options.uri + ' Please double check your available client ids at '  + getAppsListUrl() + ' ' + appSettings.additionalSettings.companyEmail + " and ask them to make you a collaborator at "  + getAppsListUrl() +  " and run gulp devSetup again.");
        }
        /** @namespace response.privateConfig */
        if(response.privateConfig){
            privateConfig = response.privateConfig;
            writeToFile(defaultPrivateConfigPath, prettyJSONStringify(privateConfig));
            try {
                writeToFile(chromeExtensionBuildPath + '/' + defaultPrivateConfigPath, prettyJSONStringify(privateConfig));
            } catch (err){
                logDebug(err);
            }
        }
        writeToFile(defaultAppConfigPath, prettyJSONStringify(appSettings));
        try {
            writeToFile(chromeExtensionBuildPath + '/' + defaultAppConfigPath, prettyJSONStringify(appSettings));
        } catch (err){
            logDebug(err);
        }
        logDebug("Writing to " + defaultAppConfigPath + ": " + prettyJSONStringify(appSettings));
        writeToFile(appConfigDirectoryPath + process.env.QUANTIMODO_CLIENT_ID + ".config.json", prettyJSONStringify(appSettings));
        /** @namespace response.allConfigs */
        if(response.allConfigs){
            for (var i = 0; i < response.allConfigs.length; i++) {
                writeToFile(appConfigDirectoryPath + response.allConfigs[i].clientId + ".config.json", prettyJSONStringify(response.allConfigs[i]));
            }
        }
    }
    return makeApiRequest(options, successHandler);
});
var buildSettings;
gulp.task('downloadAndroidReleaseKeystore', ['getAppConfigs'], function () {
    /** @namespace buildSettings.androidReleaseKeystoreFile */
    if(!buildSettings.androidReleaseKeystoreFile){
        logError( "No Android Keystore provided.  Using QuantiModo one.  If you have your own, please upload it at " + getAppDesignerUrl());
        return;
    }
    /** @namespace buildSettings.androidReleaseKeystorePassword */
    if(!buildSettings.androidReleaseKeystorePassword){
        logError( "No Android keystore storePassword provided.  Using QuantiModo one.  If you have your own, please add it at " + getAppDesignerUrl());
        return;
    }
    /** @namespace buildSettings.androidReleaseKeyAlias */
    if(!buildSettings.androidReleaseKeyAlias){
        logError( "No Android keystore alias provided.  Using QuantiModo one.  If you have your own, please add it at " + getAppDesignerUrl());
        return;
    }
    /** @namespace buildSettings.androidReleaseKeyPassword */
    if(!buildSettings.androidReleaseKeyPassword){
        logError( "No Android keystore password provided.  Using QuantiModo one.  If you have your own, please add it at " + getAppDesignerUrl());
        return;
    }
    var buildJson = {
        "android": {
            "release": {
                "keystore":"quantimodo.keystore",
                "storePassword": buildSettings.androidReleaseKeystorePassword,
                "alias": buildSettings.androidReleaseKeyAlias,
                "password": buildSettings.androidReleaseKeyPassword,
                "keystoreType":""
            }
        }
    };
    writeToFile('build.json', prettyJSONStringify(buildJson));
    return downloadEncryptedFile(buildSettings.androidReleaseKeystoreFile, "quantimodo.keystore");
});
gulp.task('downloadAndroidDebugKeystore', ['getAppConfigs'], function () {
    if(!buildSettings.androidReleaseKeystoreFile){
        throw "Please upload your Android release keystore at " + getAppEditUrl();
    }
    return downloadEncryptedFile(buildSettings.androidReleaseKeystoreFile, "debug.keystore");
});
gulp.task('getAndroidManifest', ['getAppConfigs'], function () {
    /** @namespace buildSettings.androidMaifestJsonFile */
    if(!buildSettings.androidMaifestJsonFile){
        logError("Please add your Android manifest.json at " + getAppEditUrl() + " to enable Google Play Store subscriptions");
    }
    return downloadEncryptedFile(buildSettings.androidMaifestJsonFile, "www/manifest.json");
});
gulp.task('verify-and-post-notify-collaborators-android', ['getAppConfigs'], function (callback) {
    runSequence(
        'verifyExistenceOfAndroidX86ReleaseBuild',
        'verifyExistenceOfAndroidArmV7ReleaseBuild',
        'verifyExistenceOfChromeExtension',
        'post-notify-collaborators-android',
        callback);
});
gulp.task('post-notify-collaborators-android', ['getAppConfigs'], function () {
    return postNotifyCollaborators('android');
});
gulp.task('post-app-status', [], function () {
    return postAppStatus();
});
gulp.task('validateChromeManifest', function () {
    return validateJsonFile(getPathToUnzippedChromeExtension() + '/manifest.json');
});
gulp.task('verifyExistenceOfDefaultConfig', function () {
    return verifyExistenceOfFile(defaultAppConfigPath);
});
gulp.task('verifyExistenceOfAndroidX86ReleaseBuild', function () {
    if(buildSettings.xwalkMultipleApk){
        return verifyExistenceOfFile(pathToReleasex86Apk);
    }
});
gulp.task('verifyExistenceOfAndroidArmV7ReleaseBuild', function () {
    if(buildSettings.xwalkMultipleApk){
        return verifyExistenceOfFile(pathToReleaseArmv7Apk);
    }
});
gulp.task('verifyExistenceOfChromeExtension', function () {
    return verifyExistenceOfFile(getPathToChromeExtensionZip());
});
gulp.task('getCommonVariables', function () {
    logInfo('gulp getCommonVariables...');
    return request({url: appHostName + '/api/v1/public/variables?removeAdvancedProperties=true&limit=200&sort=-numberOfUserVariables&numberOfUserVariables=(gt)3', headers: {'User-Agent': 'request'}})
        .pipe(source('commonVariables.json'))
        .pipe(streamify(jeditor(function (commonVariables) {
            return commonVariables;
        })))
        .pipe(gulp.dest('./www/data/'));
});
gulp.task('getUnits', function () {
    logInfo('gulp getUnits...');
    return request({url: appHostName + '/api/v1/units', headers: {'User-Agent': 'request'}})
        .pipe(source('units.json'))
        .pipe(streamify(jeditor(function (units) {
            return units;
        })))
        .pipe(gulp.dest('./www/data/'));
});
gulp.task('getSHA1FromAPK', function () {
    logInfo('Make sure openssl works on your command line and the bin folder is in your PATH env: https://code.google.com/archive/p/openssl-for-windows/downloads');
    var cmd = 'keytool -list -printcert -jarfile ' + pathToReleaseArmv7Apk + ' | grep -Po "(?<=SHA1:) .*" |  xxd -r -p | openssl base64';
    return execute(cmd, function (error) {
        if (error !== null) {logError('ERROR: ' + error);} else {logInfo('DECRYPTED to ' + pathToReleaseArmv7Apk);}
    });
});
gulp.task('outputX86ApkVersionCode', function () {
    if(buildSettings.xwalkMultipleApk){
        return outputVersionCodeForApk(pathToReleasex86Apk);
    }
});
gulp.task('outputArmv7ApkVersionCode', function () {
    if(buildSettings.xwalkMultipleApk){
        return outputVersionCodeForApk(pathToReleaseArmv7Apk);
    }
});
gulp.task('outputCombinedApkVersionCode', function () {
    if(!buildSettings.xwalkMultipleApk){
        return outputVersionCodeForApk(pathToReleaseArmv7Apk);
    }
});
gulp.task('unzipChromeExtension', function () {
    return unzipFile(getPathToChromeExtensionZip(), getPathToUnzippedChromeExtension());
});
gulp.task('sass', function (done) {
    gulp.src('./src/scss/app.scss')  // Can't use "return" because gulp doesn't know whether to respect that or the "done" callback
        .pipe(sass({errLogToConsole: true}))
        .pipe(gulp.dest('./src/css/'))
        .pipe(minifyCss({keepSpecialComments: 0}))
        .pipe(rename({extname: '.min.css'}))
        .pipe(gulp.dest('./www/css/'))
        .on('end', done);
});
gulp.task('watch', function () {gulp.watch(paths.sass, ['sass']);});
gulp.task('install', ['git-check'], function () {
    return bower.commands.install().on('log', function (data) {gutil.log('bower', gutil.colors.cyan(data.id), data.message);});
});
gulp.task('deleteNodeModules', function () {
    logInfo('If file is locked in Windows, open Resource Monitor as Administrator.  Then go to CPU -> Associated ' +
        'Handles and search for the locked file.  Then right click to kill all the processes using it.  Then try this ' +
        'task again.');
    return cleanFolder('node_modules');
});
gulp.task('getDevAccessTokenFromUserInput', [], function () {
    var deferred = q.defer();
    if(devCredentials.accessToken){
        process.env.QUANTIMODO_ACCESS_TOKEN = devCredentials.accessToken;
        logInfo("Using username " + devCredentials.accessToken + " from " + devCredentialsPath);
        deferred.resolve();
        return deferred.promise;
    }
    inquirer.prompt([{
        type: 'input', name: 'accessToken', message: 'Please enter your QuantiModo access token obtained from http://app.quantimo.do/api/v2/account: '
    }], function (answers) {
        process.env.QUANTIMODO_ACCESS_TOKEN = devCredentials.accessToken = answers.accessToken.trim();
        deferred.resolve();
    });
    return deferred.promise;
});
gulp.task('devSetup', [], function (callback) {
    runSequence(
        'getDevAccessTokenFromUserInput',
        'getClientIdFromUserInput',
        'validateAndSaveDevCredentials',
        //'configureApp',
        //'ionicServe',
        callback);
});
gulp.task('getClientIdFromUserInput', function () {
    var deferred = q.defer();
    inquirer.prompt([{
        type: 'input', name: 'clientId', message: 'Please enter the client id obtained at '  + getAppsListUrl() + ": "
    }], function (answers) {
        process.env.QUANTIMODO_CLIENT_ID = answers.clientId.trim();
        deferred.resolve();
    });
    return deferred.promise;
});
var updatedVersion = '';
gulp.task('getUpdatedVersion', ['getClientIdFromUserInput'], function () {
    var deferred = q.defer();
    inquirer.prompt([{
        type: 'confirm', name: 'updatedVersion', 'default': false,
        message: 'Have you updated the app\'s version number in chromeApps/' + process.env.QUANTIMODO_CLIENT_ID + '/manifest.json ?'
    }], function (answers) {
        /** @namespace answers.updatedVersion */
        if (answers.updatedVersion) {
            updatedVersion = answers.updatedVersion;
            deferred.resolve();
        } else {
            logInfo('PLEASE UPDATE IT BEFORE UPLOADING');
            deferred.reject();
        }
    });
    return deferred.promise;
});
gulp.task('copyWwwFolderToChromeApp', ['getUpdatedVersion'], function () {
    return copyFiles('www/**/*', 'chromeApps/' + process.env.QUANTIMODO_CLIENT_ID + '/www');
});
gulp.task('zipChromeApp', ['copyWwwFolderToChromeApp'], function () {
    return gulp.src(['chromeApps/' + process.env.QUANTIMODO_CLIENT_ID + '/**/*'])
        .pipe(zip(process.env.QUANTIMODO_CLIENT_ID + '.zip'))
        .pipe(gulp.dest('chromeApps/zips'));
});
gulp.task('openChromeAuthorizationPage', ['zipChromeApp'], function () {
    var deferred = q.defer();
    gulp.src(__filename)
        .pipe(open({uri: 'https://accounts.google.com/o/oauth2/auth?response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&client_id=1052648855194-h7mj5q7mmc31k0g3b9rj65ctk0uejo9p.apps.googleusercontent.com&redirect_uri=urn:ietf:wg:oauth:2.0:oob'}));
    deferred.resolve();
});
var code = '';
gulp.task('getChromeAuthorizationCode', ['openChromeAuthorizationPage'], function () {
    var deferred = q.defer();
    setTimeout(function () {
        logInfo('Starting getChromeAuthorizationCode');
        inquirer.prompt([{
            type: 'input', name: 'code', message: 'Please Enter the Code Generated from the opened website: '
        }], function (answers) {
            code = answers.code;
            code = code.trim();
            logInfo('code: ', code);
            deferred.resolve();
        });
    }, 2000);
    return deferred.promise;
});
var access_token = '';
gulp.task('getAccessTokenFromGoogle', ['getChromeAuthorizationCode'], function () {
    var deferred = q.defer();
    var options = {
        method: 'POST',
        url: 'https://accounts.google.com/o/oauth2/token',
        form: {
            client_id: '1052648855194-h7mj5q7mmc31k0g3b9rj65ctk0uejo9p.apps.googleusercontent.com',
            client_secret: 'gXbySqbFgRcg_RM9bIiXUmIS',
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: 'urn:ietf:wg:oauth:2.0:oob'
        }
    };
    request(options, function (error, message, response) {
        if (error) {
            logError('ERROR: Failed to generate the access code', error);
            defer.reject();
        } else {
            response = JSON.parse(response);
            access_token = response.access_token;
            deferred.resolve();
        }
    });
    return deferred.promise;
});
gulp.task("upload-chrome-extension-to-s3", function() {return uploadBuildToS3(getPathToChromeExtensionZip());});
gulp.task("upload-x86-release-apk-to-s3", function() {
    if(buildSettings.xwalkMultipleApk){
        return uploadBuildToS3(pathToReleasex86Apk);
    }
});
gulp.task("upload-armv7-release-apk-to-s3", function() {
    if(buildSettings.xwalkMultipleApk){
        return uploadBuildToS3(pathToReleaseArmv7Apk);
    }
});
gulp.task("upload-combined-release-apk-to-s3", function() {
    if(!buildSettings.xwalkMultipleApk){
        return uploadBuildToS3(pathToCombinedReleaseApk);
    }
});
gulp.task('uploadChromeApp', ['getAccessTokenFromGoogle'], function () {
    var deferred = q.defer();
    var source = fs.createReadStream('./chromeApps/zips/' + process.env.QUANTIMODO_CLIENT_ID + '.zip');
    // upload the package
    var options = {
        url: 'https://www.googleapis.com/upload/chromewebstore/v1.1/items/' + appIds[process.env.QUANTIMODO_CLIENT_ID],
        method: 'PUT',
        headers: {'Authorization': 'Bearer ' + access_token, 'x-goog-api-version': '2'}
    };
    logInfo('Generated URL for upload operation: ', options.url);
    logInfo('The Access Token: Bearer ' + access_token);
    logInfo('UPLOADING. .. .. Please Wait! .. .');
    source.pipe(request(options, function (error, message, data) {
        if (error) {
            logError('ERROR: Error in Uploading Data', error);
            deferred.reject();
        } else {
            logInfo('Upload Response Received');
            data = JSON.parse(data);
            /** @namespace data.uploadState */
            if (data.uploadState === 'SUCCESS') {
                logInfo('Uploaded successfully!');
                deferred.resolve();
            } else {
                logInfo('Failed to upload the zip file');
                logInfo(JSON.stringify(data, 0, 2));
                deferred.reject();
            }
        }
    }));
    return deferred.promise;
});
var shouldPublish = true;
gulp.task('shouldPublish', ['uploadChromeApp'], function () {
    var deferred = q.defer();
    inquirer.prompt([{
        type: 'confirm',
        name: 'shouldPublish',
        message: 'Should we publish this version?',
        default: true
    }], function (answers) {
        /** @namespace answers.shouldPublish */
        if (answers.shouldPublish) {
            shouldPublish = answers.shouldPublish;
            deferred.resolve();
        } else {
            logInfo('Ended without publishing!');
            deferred.reject();
        }
    });
    return deferred.promise;
});
gulp.task('publishToGoogleAppStore', ['shouldPublish'], function () {
    var deferred = q.defer();
    // upload the package
    var options = {
        url: 'https://www.googleapis.com/chromewebstore/v1.1/items/' + appIds[process.env.QUANTIMODO_CLIENT_ID] + '/publish?publishTarget=trustedTesters',
        method: 'POST',
        headers: {'Authorization': 'Bearer ' + access_token, 'x-goog-api-version': '2', 'publishTarget': 'trustedTesters', 'Content-Length': '0'}
    };
    request(options, function (error, message, publishResult) {
        if (error) {
            logError('ERROR: error in publishing to trusted Users', error);
            deferred.reject();
        } else {
            publishResult = JSON.parse(publishResult);
            if (publishResult.status.indexOf('OK') > -1) {
                logInfo('published successfully');
                deferred.resolve();
            } else {
                logInfo('not published');
                logInfo(publishResult);
                deferred.reject();
            }
        }
    });
    return deferred.promise;
});
gulp.task('chrome', ['publishToGoogleAppStore'], function () {logInfo('Enjoy your day!');});
gulp.task('git-check', function (done) {
    if (!sh.which('git')) {
        logInfo(
            '  ' + gutil.colors.red('Git is not installed.'),
            '\n  Git, the version control system, is required to download Ionic.',
            '\n  Download git here:', gutil.colors.cyan('http://git-scm.com/downloads') + '.',
            '\n  Once git is installed, run \'' + gutil.colors.cyan('gulp install') + '\' again.'
        );
        process.exit(1);
    }
    done();
});
gulp.task('deleteIOSApp', function () {
    var deferred = q.defer();
    execute('ionic platform rm ios', function (error) {
        if (error !== null) {
            logError('ERROR: REMOVING IOS APP: ' + error);
            deferred.reject();
        } else {
            logInfo('\n***PLATFORM REMOVED****');
            deferred.resolve();
        }
    });
    return deferred.promise;
});
gulp.task('encryptSupplyJsonKeyForGooglePlay', [], function (callback) {
    var fileToEncryptPath = 'supply_json_key_for_google_play.json';
    var encryptedFilePath = 'supply_json_key_for_google_play.json.enc';
    encryptFile(fileToEncryptPath, encryptedFilePath, callback);
});
gulp.task('decryptSupplyJsonKeyForGooglePlay', [], function (callback) {
    var fileToDecryptPath = 'supply_json_key_for_google_play.json.enc';
    var decryptedFilePath = 'supply_json_key_for_google_play.json';
    decryptFile(fileToDecryptPath, decryptedFilePath, callback);
});
gulp.task('encryptBuildJson', [], function (callback) {
    var fileToEncryptPath = 'build.json';
    var encryptedFilePath = 'build.json.enc';
    encryptFile(fileToEncryptPath, encryptedFilePath, callback);
});
gulp.task('decryptBuildJson', [], function (callback) {
    var fileToDecryptPath = 'build.json.enc';
    var decryptedFilePath = 'build.json';
    decryptFile(fileToDecryptPath, decryptedFilePath, callback);
});
gulp.task('encryptPrivateConfig', [], function () {
    encryptPrivateConfig();
});
gulp.task('encryptAllPrivateConfigs', [], function () {
    var glob = require('glob');
    glob(privateConfigDirectoryPath + '*.json', {}, function (er, files) {
        logInfo(JSON.stringify(files));
        for (var i = 0; i < files.length; i++) {
            encryptFile(files[i], files[i] + '.enc');
        }
    });
});
gulp.task('decryptAllPrivateConfigs', [], function () {
    var glob = require('glob');
    glob(privateConfigDirectoryPath + '*.enc', {}, function (er, files) {
        logInfo(JSON.stringify(files));
        for (var i = 0; i < files.length; i++) {
            decryptFile(files[i], files[i].replace('.enc', ''));
        }
    });
});
gulp.task('minify-js-generate-css-and-index-html', ['cleanCombinedFiles'], function() {
    var jsFilter = filter("**/*.js", { restore: true });
    var cssFilter = filter("**/*.css", { restore: true });
    var indexHtmlFilter = filter(['**/*', '!**/index.html'], { restore: true });
    return gulp.src("src/index.html")
        .pipe(useref())      // Concatenate with gulp-useref
        .pipe(jsFilter)
        .pipe(uglify())             // Minify any javascript sources
        .pipe(jsFilter.restore)
        .pipe(cssFilter)
        .pipe(csso())               // Minify any CSS sources
        .pipe(cssFilter.restore)
        .pipe(indexHtmlFilter)
        .pipe(rev())                // Rename the concatenated files (but not index.html)
        .pipe(indexHtmlFilter.restore)
        .pipe(revReplace())         // Substitute in new filenames
        .pipe(gulp.dest('www'));
});
gulp.task('deleteFacebookPlugin', function (callback) {
    logInfo('If this doesn\'t work, just use gulp cleanPlugins');
    executeCommand('cordova plugin rm phonegap-facebook-plugin', callback);
});
gulp.task('deleteGooglePlusPlugin', function (callback) {
    logInfo('If this doesn\'t work, just use gulp cleanPlugins');
    execute('cordova plugin rm cordova-plugin-googleplus', callback);
});
gulp.task('ionicPlatformAddIOS', function (callback) {
    executeCommand('ionic platform add ios', callback);
});
gulp.task('ionicServe', function (callback) {
    logInfo("The app should open in a new browser tab in a few seconds. If it doesn't, run `ionic serve` from the command line in the root of the repository.");
    executeCommand('ionic serve', callback);
});
gulp.task('ionicStateReset', function (callback) {
    executeCommand('ionic state reset', callback);
});
gulp.task('fastlaneSupplyBeta', ['decryptSupplyJsonKeyForGooglePlay'], function (callback) {
    fastlaneSupply('beta', callback);
});
gulp.task('fastlaneSupplyProduction', ['decryptSupplyJsonKeyForGooglePlay'], function (callback) {
    fastlaneSupply('production', callback);
});
gulp.task('ionicResources', function (callback) {
    executeCommand('ionic resources', callback);
});
gulp.task('androidDebugKeystoreInfo', function (callback) {
    logInfo('androidDebugKeystoreInfo gets stuck for some reason');
    callback();
    //executeCommand("keytool -exportcert -list -v -alias androiddebugkey -keystore debug.keystore", callback);
});
gulp.task('gitPull', function () {
    var commandForGit = 'git pull';
    execute(commandForGit, function (error, output) {
        output = output.trim();
        if (error) {
            logError('ERROR: Failed to pull: ' + output, error);
        } else {
            logInfo('Pulled changes ' + output);
        }
    });
});
gulp.task('gitCheckoutAppJs', function () {
    var commandForGit = 'git checkout -- www/js/app.js';
    execute(commandForGit, function (error, output) {
        output = output.trim();
        if (error) {
            logError('ERROR: Failed to gitCheckoutAppJs: ' + output, error);
        } else {
            logInfo('gitCheckoutAppJs ' + output);
        }
    });
});
gulp.task('ionicUploadStaging', function (callback) {
    process.env.RELEASE_STAGE = 'staging';
    ionicUpload(callback);
});
gulp.task('ionicUploadProduction', function (callback) {
    process.env.RELEASE_STAGE = 'production';
    ionicUpload(callback);
});
gulp.task('ionicUpload', function (callback) {
    ionicUpload(callback);
});
gulp.task('ionicUploadProductionForAllApps', function (callback) {
    process.env.RELEASE_STAGE = 'production';
    runSequence(
        'ionicUploadAllApps',
        callback);
});
gulp.task('fastlaneSupplyBetaQuantiModo', function (callback) {
    runSequence(
        'setQuantiModoEnvs',
        'configureApp',
        'fastlaneSupplyBeta',
        callback);
});
gulp.task('ionicUploadStagingForAllApps', function (callback) {
    process.env.RELEASE_STAGE = 'production';
    runSequence(
        'ionicUploadAllApps',
        callback);
});
gulp.task('ionicUploadAllApps', function (callback) {
    runSequence(
        'setMediModoEnvs',
        'configureApp',
        'ionicUploadProduction',
        'setMoodiModoEnvs',
        'configureApp',
        'ionicUploadProduction',
        'setQuantiModoEnvs',
        'configureApp',
        'ionicUploadProduction',
        callback);
});
gulp.task('ionicAddCrosswalk', function (callback) {
    var command = 'ionic plugin add cordova-plugin-crosswalk-webview@2.2.0';  // Trying 2.2.0 to fix XWalkWebViewEngine is not abstract and does not override abstract method evaluateJavascript
    executeCommand(command, callback);
});
gulp.task('ionicInfo', function (callback) {
    var command = 'ionic info';
    executeCommand(command, callback);
});
gulp.task('cordovaPlatformVersionAndroid', function (callback) {
    var command = 'cordova platform version android';
    executeCommand(command, callback);
});
gulp.task('downloadGradle', function () {
    return request('https://services.gradle.org/distributions/gradle-2.14.1-bin.zip')
        .pipe(fs.createWriteStream('gradle-2.14.1-bin.zip'));
});
gulp.task('addFacebookPlugin', ['getAppConfigs'], function () {
    var deferred = q.defer();
    var addFacebookPlugin = function () {
        var commands = [
            'cordova -d plugin add ../fbplugin/phonegap-facebook-plugin',
            'APP_ID="' + privateConfig.FACEBOOK_APP_ID + '"',
            'APP_NAME="' + privateConfig.FACEBOOK_APP_NAME + '"'
        ].join(' --variable ');
        execute(commands, function (error) {
            if (error !== null) {
                logError('ERROR: THERE WAS AN ERROR:ADDING THE FACEBOOK PLUGIN***', error);
                deferred.reject();
            } else {
                logInfo('\n***FACEBOOK PLUGIN SUCCESSFULLY ADDED***');
                deferred.resolve();
            }
        });
    };
    fs.exists('../fbplugin', function (exists) {
        if (exists) {
            logInfo('FACEBOOK REPO ALREADY CLONED');
            addFacebookPlugin();
        } else {
            logInfo('FACEBOOK REPO NOT FOUND, CLONING https://github.com/Wizcorp/phonegap-facebook-plugin.git NOW');
            var commands = [
                'cd ../',
                'mkdir fbplugin',
                'cd fbplugin',
                'GIT_CURL_VERBOSE=1 GIT_TRACE=1 git clone https://github.com/Wizcorp/phonegap-facebook-plugin.git'
            ].join(' && ');
            /*			//Try this if you get the muliple dex file error still
             logInfo("FACEBOOK REPO NOT FOUND, CLONING https://github.com/Telerik-Verified-Plugins/Facebook.git NOW");
             var commands = [
             "cd ../",
             "mkdir fbplugin",
             "cd fbplugin",
             "GIT_CURL_VERBOSE=1 GIT_TRACE=1 git clone https://github.com/Telerik-Verified-Plugins/Facebook.git"
             ].join(' && ');
             */
            execute(commands, function (error) {
                if (error !== null) {
                    logError('ERROR: THERE WAS AN ERROR:DOWNLOADING THE FACEBOOK PLUGIN***', error);
                    deferred.reject();
                } else {
                    logInfo('\n***FACEBOOK PLUGIN DOWNLOADED, NOW ADDING IT TO IONIC PROJECT***');
                    addFacebookPlugin();
                }
            });
        }
    });
    return deferred.promise;
});
//gulp.task('addGooglePlusPlugin', ['deleteGooglePlusPlugin'] , function(){
// Can't do this because failure of deleteGooglePlusPlugin prevents next task.  Use runSequence instead
gulp.task('addGooglePlusPlugin', [], function () {
    var deferred = q.defer();
    if (!process.env.REVERSED_CLIENT_ID) {
        process.env.REVERSED_CLIENT_ID = 'com.googleusercontent.apps.1052648855194-djmit92q5bbglkontak0vdc7lafupt0d';
        logInfo('No REVERSED_CLIENT_ID env specified. Falling back to ' + process.env.REVERSED_CLIENT_ID);
    }
    var commands = [
        'cordova -d plugin add https://github.com/mikepsinn/cordova-plugin-googleplus.git#89ac9f2e8d521bacaaf3989a22b50e4d0b5d6d09',
        'REVERSED_CLIENT_ID="' + process.env.REVERSED_CLIENT_ID + '"'
    ].join(' --variable ');
    execute(commands, function (error) {
        if (error !== null) {
            logError('ERROR: ADDING THE GOOGLE PLUS PLUGIN***', error);
            deferred.reject();
        } else {
            logInfo('\n***GOOGLE PLUS PLUGIN ADDED****');
            deferred.resolve();
        }
    });
    return deferred.promise;
});
gulp.task('fixResourcesPlist', function () {
    var deferred = q.defer();
    if (!appSettings.appDisplayName) {deferred.reject('Please export appSettings.appDisplayName');}
    var myPlist = plist.parse(fs.readFileSync('platforms/ios/' + appSettings.appDisplayName + '/' + appSettings.appDisplayName + '-Info.plist', 'utf8'));
    var LSApplicationQueriesSchemes = [
        'fbapi',
        'fbapi20130214',
        'fbapi20130410',
        'fbapi20130702',
        'fbapi20131010',
        'fbapi20131219',
        'fbapi20140410',
        'fbapi20140116',
        'fbapi20150313',
        'fbapi20150629',
        'fbauth',
        'fbauth2',
        'fb-messenger-api20140430'
    ];
    myPlist.LSApplicationQueriesSchemes = LSApplicationQueriesSchemes.concat(myPlist.LSApplicationQueriesSchemes);
    if (myPlist.NSAppTransportSecurity && myPlist.NSAppTransportSecurity.NSExceptionDomains) {
        var facebookDotCom = {};
        /** @namespace myPlist.NSAppTransportSecurity.NSExceptionDomains */
        if (myPlist.NSAppTransportSecurity.NSExceptionDomains['facebook.com']) {
            facebookDotCom = myPlist.NSAppTransportSecurity.NSExceptionDomains['facebook.com'];
        }
        if (!facebookDotCom.NSIncludesSubdomains) {facebookDotCom.NSIncludesSubdomains = true;}
        if (!facebookDotCom.NSThirdPartyExceptionRequiresForwardSecrecy) {facebookDotCom.NSThirdPartyExceptionRequiresForwardSecrecy = false;}
        /** @namespace myPlist.NSAppTransportSecurity */
        myPlist.NSAppTransportSecurity.NSExceptionDomains['facebook.com'] = facebookDotCom;
        logInfo('Updated facebook.com');
        var fbcdnDotNet = {};
        if (myPlist.NSAppTransportSecurity.NSExceptionDomains['fbcdn.net']) {fbcdnDotNet = myPlist.NSAppTransportSecurity.NSExceptionDomains['fbcdn.net'];}
        if (!fbcdnDotNet.NSIncludesSubdomains) {fbcdnDotNet.NSIncludesSubdomains = true;}
        if (!fbcdnDotNet.NSThirdPartyExceptionRequiresForwardSecrecy) {fbcdnDotNet.NSThirdPartyExceptionRequiresForwardSecrecy = false;}
        myPlist.NSAppTransportSecurity.NSExceptionDomains['fbcdn.net'] = fbcdnDotNet;
        logInfo('Updated fbcdn.net');
        // akamaihd.net
        var akamaihdDotNet = {};
        if (myPlist.NSAppTransportSecurity.NSExceptionDomains['akamaihd.net']) {
            akamaihdDotNet = myPlist.NSAppTransportSecurity.NSExceptionDomains['akamaihd.net'];
        }
        if (!akamaihdDotNet.NSIncludesSubdomains) {akamaihdDotNet.NSIncludesSubdomains = true;}
        if (!akamaihdDotNet.NSThirdPartyExceptionRequiresForwardSecrecy) {akamaihdDotNet.NSThirdPartyExceptionRequiresForwardSecrecy = false;}
        myPlist.NSAppTransportSecurity.NSExceptionDomains['akamaihd.net'] = akamaihdDotNet;
        logInfo('Updated akamaihd.net');
    }
    fs.writeFile('platforms/ios/' + appSettings.appDisplayName + '/' + appSettings.appDisplayName + '-Info.plist', plist.build(myPlist), 'utf8', function (err) {
        if (err) {
            logError('ERROR: error writing to plist', err);
            deferred.reject();
        } else {
            logInfo('successfully updated plist');
            deferred.resolve();
        }
    });
    return deferred.promise;
});
gulp.task('addPodfile', function () {
    var deferred = q.defer();
    if (!appSettings.appDisplayName) {deferred.reject('Please export appSettings.appDisplayName');}
    var addBugsnagToPodfile = function () {
        fs.readFile('./platforms/ios/Podfile', function (err, data) {
            if (err) {throw err;}
            //if(data.indexOf('pod \'Bugsnag\', :git => "https://github.com/bugsnag/bugsnag-cocoa.git"') < 0){
            if (data.indexOf('Bugsnag') < 0) {
                logInfo('no Bugsnag detected');
                gulp.src('./platforms/ios/Podfile')
                    .pipe(change(function (content) {
                        var bugsnag_str = 'target \'' + appSettings.appDisplayName + '\' do \npod \'Bugsnag\', :git => "https://github.com/bugsnag/bugsnag-cocoa.git"';
                        logInfo('Bugsnag Added to Podfile');
                        deferred.resolve();
                        return content.replace(/target.*/g, bugsnag_str);
                    }))
                    .pipe(gulp.dest('./platforms/ios/'));
            } else {
                logInfo('Bugsnag already present in Podfile');
                deferred.resolve();
            }
        });
    };
    fs.exists('./platforms/ios/Podfile', function (exists) {
        if (exists) {
            logInfo('Podfile');
            addBugsnagToPodfile();
        } else {
            logInfo('PODFILE REPO NOT FOUND, Installing it First');
            var commands = [
                'cd ./platforms/ios',
                'pod init'
            ].join(' && ');
            execute(commands, function (error) {
                if (error !== null) {
                    logError('ERROR: There was an error detected', error);
                    deferred.reject();
                } else {
                    logInfo('\n***Podfile Added****');
                    addBugsnagToPodfile();
                }
            });
        }
    });
    return deferred.promise;
});
gulp.task('addInheritedToOtherLinkerFlags', function () {
    if (!appSettings.appDisplayName) {logInfo('Please export appSettings.appDisplayName');}
    return gulp.src('./platforms/ios/' + appSettings.appDisplayName + '.xcodeproj/project.pbxproj')
        .pipe(change(function (content) {
            return content.replace(/OTHER_LDFLAGS(\s+)?=(\s+)?(\s+)\(/g, 'OTHER_LDFLAGS = (\n\t\t\t\t\t"$(inherited)",');
        }))
        .pipe(gulp.dest('./platforms/ios/' + appSettings.appDisplayName + '.xcodeproj/'));
});
gulp.task('addDeploymentTarget', function () {
    if (!appSettings.appDisplayName) {logInfo('Please export appSettings.appDisplayName');}
    return gulp.src('./platforms/ios/' + appSettings.appDisplayName + '.xcodeproj/project.pbxproj')
        .pipe(change(function (content) {
            if (content.indexOf('IPHONEOS_DEPLOYMENT_TARGET') === -1) {
                return content.replace(/ENABLE_BITCODE(\s+)?=(\s+)?(\s+)NO\;/g, 'IPHONEOS_DEPLOYMENT_TARGET = 6.0;\ENABLE_BITCODE = NO;');
            }
            return content;
        }))
        .pipe(change(function (content) {
            logInfo('*****************\n\n\n', content, '\n\n\n*****************');
        }))
        .pipe(gulp.dest('./platforms/ios/' + appSettings.appDisplayName + '.xcodeproj/'));
});
gulp.task('installPods', ['addPodfile'], function () {
    var deferred = q.defer();
    var commands = [
        'cd platforms/ios',
        'pod install'
    ].join(' && ');
    execute(commands, function (error) {
        if (error !== null) {
            logError('ERROR: There was an error detected', error);
            deferred.reject();
        } else {
            logInfo('\n***Pods Installed****');
            deferred.resolve();
        }
    });
    return deferred.promise;
});
gulp.task('addBugsnagInObjC', function () {
    if (!appSettings.appDisplayName) {logInfo('Please export appSettings.appDisplayName');}
    return gulp.src('./platforms/ios/' + appSettings.appDisplayName + '/Classes/AppDelegate.m')
        .pipe(change(function (content) {
            if (content.indexOf('Bugsnag') !== -1) {
                logInfo('Bugsnag Already Present');
                return content;
            } else {
                content = content.replace(/#import "MainViewController.h"/g, '#import "MainViewController.h"\n#import "Bugsnag.h"');
                content = content.replace(/self\.window\.rootViewController(\s)?=(\s)?self\.viewController\;/g, '[Bugsnag startBugsnagWithApiKey:@"ae7bc49d1285848342342bb5c321a2cf"];\n\tself.window.rootViewController = self.viewController;');
                logInfo('Bugsnag Added');
            }
            return content;
        }))
        .pipe(gulp.dest('./platforms/ios/' + appSettings.appDisplayName + '/Classes/'));
});
gulp.task('enableBitCode', function () {
    if (!appSettings.appDisplayName) {logInfo('Please export appSettings.appDisplayName');}
    return gulp.src('./platforms/ios/' + appSettings.appDisplayName + '.xcodeproj/project.pbxproj')
        .pipe(change(function (content) {
            return content.replace(/FRAMEWORK_SEARCH_PATHS(\s*)?=(\s*)?\(/g, 'ENABLE_BITCODE = NO;\n\t\t\t\tFRAMEWORK_SEARCH_PATHS = (');
        }))
        .pipe(gulp.dest('./platforms/ios/' + appSettings.appDisplayName + '.xcodeproj/'));
});
gulp.task('makeIosApp', function (callback) {
    runSequence(
        'deleteIOSApp',
        'deleteFacebookPlugin',
        'ionicPlatformAddIOS',
        'ionicResources',
        'addFacebookPlugin',
        //'addGooglePlusPlugin',
        'fixResourcesPlist',
        'addBugsnagInObjC',
        'enableBitCode',
        'addInheritedToOtherLinkerFlags',
        'addDeploymentTarget',
        'addPodfile',
        'installPods',
        callback);
});
gulp.task('makeIosAppSimplified', function (callback) {
    runSequence(
        'fixResourcesPlist',
        'enableBitCode',
        'addInheritedToOtherLinkerFlags',
        'addDeploymentTarget',
        callback);
});
var uncommentedCordovaScript = '<script src="cordova.js"></script>';
var commentedCordovaScript = '<!-- cordova.js placeholder -->';
gulp.task('uncommentCordovaJsInIndexHtml', function () {
    return replaceTextInFiles(['www/index.html'], commentedCordovaScript, uncommentedCordovaScript);
});
gulp.task('removeCordovaJsFromIndexHtml', function () {
    if(process.env.BUILD_IOS || process.env.BUILD_ANDROID){
        console.log("Not removing cordova.js because process.env.BUILD_IOS or process.env.BUILD_ANDROID is true");
        return;
    }
    return replaceTextInFiles(['www/index.html'], uncommentedCordovaScript, commentedCordovaScript);
});
gulp.task('setVersionNumberInFiles', function () {
    var filesToUpdate = [
        defaultAppConfigPath,
        '.travis.yml',
        'resources/chrome_app/manifest.json'
    ];
    return gulp.src(filesToUpdate, {base: '.'}) // Every file allown.
        .pipe(replace('IONIC_IOS_APP_VERSION_NUMBER_PLACEHOLDER', versionNumbers.iosCFBundleVersion))
        .pipe(replace('IONIC_APP_VERSION_NUMBER_PLACEHOLDER', versionNumbers.ionicApp))
        .pipe(gulp.dest('./'));
});
gulp.task('ic_notification', function () {
    gulp.src('./resources/android/res/**')
        .pipe(gulp.dest('./platforms/android/res'));
});
gulp.task('template', function (done) {
    gulp.src('./www/templates/**/*.html')
        .pipe(templateCache({
            standalone: true,
            root: 'templates'
        }))
        .pipe(gulp.dest('./public'))
        .on('end', done);
});
gulp.task('setEnvsFromBranchName', [], function (callback) {
    runSequence(
        'setClientId',
        'getAppConfigs',
        callback);
});
gulp.task('setMediModoEnvs', [], function (callback) {
    process.env.QUANTIMODO_CLIENT_ID = 'medimodo';
    runSequence(
        'getAppConfigs',
        callback);
});
gulp.task('setMoodiModoEnvs', [], function (callback) {
    process.env.QUANTIMODO_CLIENT_ID = 'moodimodo';
    runSequence(
        'getAppConfigs',
        callback);
});
gulp.task('setAppEnvs', ['setClientId'], function (callback) {
    runSequence(
        'getAppConfigs',
        callback);
});
gulp.task('setQuantiModoEnvs', [], function (callback) {
    process.env.QUANTIMODO_CLIENT_ID = 'quantimodo';
    runSequence(
        'getAppConfigs',
        callback);
});
gulp.task('cleanResources', [], function () {
    return cleanFolder('resources');
});
gulp.task('cleanPlugins', [], function () {
    return cleanFolder('plugins');
});
gulp.task('cleanPlatformsAndroid', [], function () {
    return cleanFolder('platforms/android');
});
gulp.task('cleanPlatforms', [], function () {
    return cleanFolder('platforms');
});
function cleanFiles(filesArray) {
    logInfo("Cleaning " + JSON.stringify(filesArray));
    return gulp.src(filesArray, {read: false}).pipe(clean());
}
function cleanFolder(folderPath) {
    logInfo("Cleaning " + folderPath + " folder...");
    return gulp.src(folderPath + '/*', {read: false}).pipe(clean());
}
gulp.task('cleanChromeBuildFolder', [], function () {
    return cleanFolder(chromeExtensionBuildPath);
});
gulp.task('cleanCombinedFiles', [], function () {
    return cleanFiles(['www/css/combined*.css', 'www/scripts/combined*.js']);
});
gulp.task('cleanBuildFolder', [], function () {
    return cleanFolder(buildPath);
});
gulp.task('copyAppResources', ['cleanResources'], function () {
    logInfo('If this doesn\'t work, make sure there are no symlinks in the apps folder!');
    return gulp.src(['apps/' + process.env.QUANTIMODO_CLIENT_ID + '/**/*'], {
        base: 'apps/' + process.env.QUANTIMODO_CLIENT_ID
    }).pipe(gulp.dest('.'));
});
gulp.task('copyIonIconsToWww', [], function () {
    return copyFiles('src/lib/Ionicons/**/*', 'www/lib/Ionicons');
});
gulp.task('copyIconsToWwwImg', [], function () {
    return copyFiles('apps/' + process.env.QUANTIMODO_CLIENT_ID + '/resources/icon*.png', pathToIcons);
});
gulp.task('copyAndroidLicenses', [], function () {
    if(!process.env.ANDROID_HOME){
        logError("Please pass ANDROID_HOME environmental variable to gulp task");
        return;
    }
    return copyFiles('android-licenses/*', process.env.ANDROID_HOME + '/licenses');
});
gulp.task('copyAndroidResources', [], function () {
    return copyFiles('resources/android/**/*', 'platforms/android');
});
gulp.task('copyAndroidBuild', [], function () {
    if (!process.env.QUANTIMODO_CLIENT_ID) {throw 'process.env.QUANTIMODO_CLIENT_ID not set!';}
    var buildFolderPath = buildPath + '/apks/' + process.env.QUANTIMODO_CLIENT_ID; // Non-symlinked apk build folder accessible by Jenkins within Vagrant box
    return copyFiles(pathToOutputApks + '/*.apk', buildFolderPath);
});
gulp.task('copyIonicCloudLibrary', [], function () {
    return copyFiles('node_modules/@ionic/cloud/dist/bundle/ionic.cloud.min.js', 'www/lib');
});
gulp.task('copyWwwFolderToChromeExtension', ['getAppConfigs'], function () {
    return copyFiles('www/**/*', chromeExtensionBuildPath);
});
gulp.task('copyWwwFolderToAndroidApp', [], function () {
    return copyFiles('www/**/*', 'platforms/android/assets/www');
});
gulp.task('copyIconsToChromeExtension', [], function () {
    return copyFiles(pathToIcons + "/*", chromeExtensionBuildPath + '/img/icons');
});
gulp.task('removeTransparentPng', [], function () {
    return gulp.src('resources/icon.png', {read: false}).pipe(clean());
});
gulp.task('removeTransparentPsd', [], function () {
    return gulp.src('resources/icon.psd', {read: false}).pipe(clean());
});
gulp.task('useWhiteIcon', ['downloadIcon'], function (callback) {
    return execute('convert -flatten resources/icon.png resources/icon.png', callback);
});
gulp.task('bowerInstall', [], function (callback) {
    return execute('bower install', callback);
});
gulp.task('ionicResourcesIos', [], function (callback) {
    return execute('ionic resources ios', callback);
});
gulp.task('generateConfigXmlFromTemplate', ['setClientId', 'getAppConfigs'], function (callback) {
    generateConfigXmlFromTemplate(callback);
});
gulp.task('prepareIosApp', function (callback) {
    platformCurrentlyBuildingFor = 'ios';
    runSequence(
        'cleanPlugins',
        'configureApp',
        //'copyAppResources',
        'uncommentCordovaJsInIndexHtml',
        'generateConfigXmlFromTemplate', // Needs to happen before resource generation so icon paths are not overwritten
        'removeTransparentPng',
        'removeTransparentPsd',
        'useWhiteIcon',
        'ionicResourcesIos',
        'copyIconsToWwwImg',
        callback);
});
gulp.task('zipChromeExtension', [], function () {
    return zipAFolder(chromeExtensionBuildPath, getChromeExtensionZipFilename(), buildPath);
});
gulp.task('zipBuild', [], function () {
    return zipAFolder(process.env.BUDDYBUILD_WORKSPACE, "buddybuild.zip", './');
});
gulp.task('uploadBuddyBuildToS3', ['zipBuild'], function () {
    return uploadBuildToS3("buddybuild.zip");
});
// Need configureAppAfterNpmInstall or prepareIosApp results in infinite loop
gulp.task('configureAppAfterNpmInstall', [], function (callback) {
    logInfo('gulp configureAppAfterNpmInstall');
    if (process.env.BUDDYBUILD_SCHEME) {
        process.env.QUANTIMODO_CLIENT_ID = process.env.BUDDYBUILD_SCHEME.toLowerCase().substr(0,str.indexOf(' '));
        logInfo('BUDDYBUILD_SCHEME is ' + process.env.BUDDYBUILD_SCHEME + ' so going to prepareIosApp');
        runSequence(
            'prepareIosApp',
            callback);
    } else if (process.env.BUDDYBUILD_SECURE_FILES) {
        logInfo('Building Android because BUDDYBUILD_SCHEME is not set and we know we\'re on BuddyBuild because BUDDYBUILD_SECURE_FILES is set to: ' + process.env.BUDDYBUILD_SECURE_FILES);
        runSequence(
            'prepareRepositoryForAndroid',
            'prepareAndroidApp',
            //'buildQuantiModoAndroid',  // Had to do this previously because buildAndroid wasn't working
            callback);
    } else {
        runSequence(
            'configureApp',
            callback);
    }
});
gulp.task('configureApp', [], function (callback) {
    runSequence(
        'setClientId',
        'copyIonIconsToWww',
        'sass',
        'minify-js-generate-css-and-index-html',
        'removeCordovaJsFromIndexHtml',
        'getCommonVariables',
        'getUnits',
        'getAppConfigs',
        'downloadIcon',
        'resizeIcons',
        'downloadSplashScreen',
        'verifyExistenceOfDefaultConfig',
        'copyIconsToWwwImg',
        'setVersionNumberInFiles',
        callback);
});
gulp.task('buildChromeExtension', ['getAppConfigs'], function (callback) {
    if(!appSettings.appStatus.buildEnabled.chromeExtension){
        logError("Not building chrome extension because appSettings.appStatus.buildEnabled.chromeExtension is " +
            appSettings.appStatus.buildEnabled.chromeExtension + ".  You can enabled it at " + getAppDesignerUrl());
        return;
    }
    runSequence(
        'cleanChromeBuildFolder',
        'bowerInstall',
        'configureApp', // Need to run sass and generate index.html
        'copyWwwFolderToChromeExtensionAndCreateManifest',
        'zipChromeExtension',
        'unzipChromeExtension',
        'validateChromeManifest',
        'upload-chrome-extension-to-s3',
        'post-app-status',
        callback);
});
gulp.task('prepareMoodiModoIos', function (callback) {
    runSequence(
        'setMoodiModoEnvs',
        'prepareIosApp',
        callback);
});
gulp.task('buildQuantiModo', function (callback) {
    runSequence(
        'setQuantiModoEnvs',
        'buildChromeExtension',
        'buildAndroidApp',
        'prepareIosApp',
        callback);
});
gulp.task('buildMoodiModo', function (callback) {
    runSequence(
        'setMoodiModoEnvs',
        'buildChromeExtension',
        //'buildAndroidApp',
        'prepareIosApp',
        callback);
});
gulp.task('buildMediModo', function (callback) {
    runSequence(
        'setMediModoEnvs',
        'buildChromeExtension',
        'buildAndroidApp',
        'prepareIosApp',
        callback);
});
gulp.task('buildQuantiModoAndroid', function (callback) {
    runSequence(
        'setQuantiModoEnvs',
        'buildAndroidApp',
        callback);
});
gulp.task('buildMediModoAndroid', function (callback) {
    runSequence(
        'setMediModoEnvs',
        'buildAndroidApp',
        callback);
});
gulp.task('buildAllChromeExtensions', function (callback) {
    runSequence(
        'setMediModoEnvs',
        'buildChromeExtension',
        'setMoodiModoEnvs',
        'buildChromeExtension',
        'setQuantiModoEnvs',
        'buildChromeExtension',
        callback);
});
gulp.task('downloadAllChromeExtensions', function (callback) {
    runSequence(
        'cleanBuildFolder',
        'setMediModoEnvs',
        'downloadChromeExtension',
        'setMoodiModoEnvs',
        'downloadChromeExtension',
        'setQuantiModoEnvs',
        'downloadChromeExtension',
        callback);
});
gulp.task('buildAllAndroidApps', function (callback) {
    runSequence(
        'cleanBuildFolder',
        'prepareRepositoryForAndroid',
        'setMediModoEnvs',
        'buildAndroidApp',
        'setQuantiModoEnvs',
        'buildAndroidApp',
        callback);
});
gulp.task('buildAllChromeExtensionsAndAndroidApps', function (callback) {
    runSequence(
        'cleanBuildFolder',
        'prepareRepositoryForAndroid',
        'setMediModoEnvs',
        'buildChromeExtension',
        'buildAndroidApp',
        'setMoodiModoEnvs',
        'buildChromeExtension',
        //'buildAndroidApp',
        'setQuantiModoEnvs',
        'buildChromeExtension',
        'buildAndroidApp',
        callback);
});
gulp.task('buildQuantiModoChromeExtension', function (callback) {
    runSequence(
        'setQuantiModoEnvs',
        'buildChromeExtension',
        callback);
});
// This is a hook so we really shouldn't need it
gulp.task('buildAndReleaseIosApp', function (callback) {
    runSequence(
        'xcodeProjectFix',
        'fastlaneBetaIos',
        callback);
});
gulp.task('fastlaneBetaIos', function (callback) {
    var command = 'fastlane beta';
    return execute(command, callback);
});
gulp.task('xcodeProjectFix', function (callback) {
    var command = 'ruby hooks/after_platform_add.bak/xcodeprojectfix.rb';
    return execute(command, callback);
});
gulp.task('ionicPlatformAddAndroid', function (callback) {
    return execute('ionic platform add android@6.2.2', callback);
});
gulp.task('ionicPlatformRemoveAndroid', function (callback) {
    return execute('ionic platform remove android', callback);
});
gulp.task('cordovaBuildAndroidDebug', function (callback) {
    if(buildDebug){
        appSettings.appStatus.buildStatus[convertFilePathToPropertyName(androidArm7DebugApkName)] = "BUILDING";
        appSettings.appStatus.buildStatus[convertFilePathToPropertyName(androidX86DebugApkName)] = "BUILDING";
        postAppStatus();
        return execute(getCordovaBuildCommand('debug', 'android'), callback);
    } else {
        console.log("Not building debug version because process.env.BUILD_DEBUG is not true");
        callback();
    }
});
gulp.task('cordovaBuildAndroidRelease', function (callback) {
    appSettings.appStatus.buildStatus[convertFilePathToPropertyName(androidArm7ReleaseApkName)] = "BUILDING";
    appSettings.appStatus.buildStatus[convertFilePathToPropertyName(androidX86ReleaseApkName)] = "BUILDING";
    postAppStatus();
    return execute(getCordovaBuildCommand('release', 'android'), callback);
});
gulp.task('prepareQuantiModoIos', function (callback) {
    runSequence(
        'setQuantiModoEnvs',
        'prepareIosApp',
        callback);
});
gulp.task('generateAndroidResources', [], function (callback) {
    return execute('ionic resources android', callback);
});
gulp.task('ionicRunAndroid', [], function (callback) {
    return execute('ionic run android', callback);
});
gulp.task('resizeIcon700', [], function (callback) { return resizeIcon(callback, 700); });
gulp.task('resizeIcon16', [], function (callback) { return resizeIcon(callback, 16); });
gulp.task('resizeIcon48', [], function (callback) { return resizeIcon(callback, 48); });
gulp.task('resizeIcon128', [], function (callback) { return resizeIcon(callback, 128); });
gulp.task('resizeIcons', function (callback) {
    runSequence('resizeIcon700',
        'resizeIcon16',
        'resizeIcon48',
        'resizeIcon128',
        callback);
});
gulp.task('prepareRepositoryForAndroid', function (callback) {
    platformCurrentlyBuildingFor = 'android';
    runSequence(
        'setAppEnvs',
        'generateConfigXmlFromTemplate',  // Must be run before addGooglePlusPlugin or running any other cordova commands
        'cleanPlatforms',
        'cleanPlugins',
        'prepareRepositoryForAndroidWithoutCleaning',
        callback);
});
gulp.task('prepareRepositoryForAndroidWithoutCleaning', function (callback) {
    if(!process.env.ANDROID_HOME){throw "ANDROID_HOME env is not set!";}
    console.log("ANDROID_HOME is " + process.env.ANDROID_HOME);
    platformCurrentlyBuildingFor = 'android';
    runSequence(
        'setAppEnvs',
        'uncommentCordovaJsInIndexHtml',
        'generateConfigXmlFromTemplate',  // Must be run before addGooglePlusPlugin or running any other cordova commands
        'ionicPlatformAddAndroid',
        'ionicAddCrosswalk',
        'ionicInfo',
        callback);
});
gulp.task('prepareAndroidApp', function (callback) {
    platformCurrentlyBuildingFor = 'android';
    runSequence(
        'configureApp',
        //'copyAppResources',
        'uncommentCordovaJsInIndexHtml',
        'generateConfigXmlFromTemplate',
        'cordovaPlatformVersionAndroid',
        'decryptBuildJson',
        'generatePlayPublicLicenseKeyManifestJson',
        'downloadAndroidReleaseKeystore',
        'generateAndroidResources',
        'copyAndroidResources',
        'copyIconsToWwwImg',
        callback);
});
gulp.task('buildAndroidApp', ['getAppConfigs'], function (callback) {
    /** @namespace appSettings.additionalSettings.monetizationSettings */
    /** @namespace appSettings.additionalSettings.monetizationSettings.subscriptionsEnabled */
    if(!appSettings.additionalSettings.monetizationSettings.playPublicLicenseKey && appSettings.additionalSettings.monetizationSettings.subscriptionsEnabled){
        logError("Please add your playPublicLicenseKey at " + getAppDesignerUrl());
        logError("No playPublicLicenseKey so disabling subscriptions on Android build");
        appSettings.additionalSettings.monetizationSettings.subscriptionsEnabled = false;
        generateDefaultConfigJson(appSettings);
    }
    /** @namespace appSettings.appStatus.buildEnabled */
    /** @namespace appSettings.appStatus.buildEnabled.androidRelease */
    if(!appSettings.appStatus.buildEnabled.androidRelease){
        logInfo("Not building android app because appSettings.appStatus.buildEnabled.androidRelease is "
            + appSettings.appStatus.buildEnabled.androidRelease + ".  You can enabled it at " + getAppDesignerUrl());
        return;
    }
    runSequence(
        'copyAndroidLicenses',
        'bowerInstall',
        'prepareAndroidApp',
        'ionicInfo',
        'cordovaBuildAndroidRelease',
        'outputArmv7ApkVersionCode',
        'outputX86ApkVersionCode',
        'outputCombinedApkVersionCode',
        'cordovaBuildAndroidDebug',
        //'copyAndroidBuild',
        "upload-x86-release-apk-to-s3",
        "upload-armv7-release-apk-to-s3",
        "upload-combined-release-apk-to-s3",
        "fastlaneSupplyBeta",
        "post-app-status",
        callback);
});
gulp.task('prepareQuantiModoAndroid', function (callback) {
    runSequence(
        'setQuantiModoEnvs',
        'prepareAndroidApp',
        callback);
});
