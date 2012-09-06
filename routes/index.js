/**
 * Dependencies
 */

var async = require('async')
  , gdata = require('gdata')
  , creds = require('../config/creds')
  , request = require('request')
  , fs = require('fs')
  , https = require('https')
  , url = require('url')
  ;
    
var Docs = new gdata.Docs;
 
/**
 * GET home page.
 */

exports.index = function (req, res, eventEmitter) {
  res.render('index', { title: 'Doccelganger' });
};

exports.upload = function (req, response, eventEmitter) {
  // create directory for "session"
  var now = new Date()
    , currentDate = 
        now.getFullYear().toString() + (now.getMonth()+1) + now.getDate()
    , timeMilli = Date.parse(now)
    , clientIp = req.body.clientIp
    , randomSession = new Buffer(Math.floor(Math.random() * timeMilli)
                    + timeMilli
                    + clientIp).toString('base64')
    , sessionPath = process.cwd() + '/public/download/'
                    + currentDate + '/'
                    + randomSession.replace(/=/g, '');
                    
  fs.mkdir(process.cwd() + '/public/download/' + currentDate)
  fs.mkdir(sessionPath);
  
  console.log("Session Start: %s", new Date());
  
  Docs.clientLogin(creds.login, creds.passwd
                , 'writely', 'btrinh-Doccelganger-0.0.1', getSession);
  var file = req.files.file;

  file.alt = file.name.replace(/\.[a-zA-Z]+?$/, '');
  file.name = file.path.split('/');
  file.name = file.name[file.name.length -1];
  file.convertFormat = req.body.format;
  file.index = req.body.index;
  
  var mediaLink = '/feeds/upload/create-session/' +  creds.loginEscaped +
                  '/private/full/folder%3A' + 
                  creds.gFolderID + '/contents'
  
  console.log("Media Link :" + mediaLink)
  
  function getSession(){
    Docs.createSession(file, mediaLink, convert);
  }
  
  function convert (done) {
    Docs.upload(file, function (data) {
      console.log("Finished Uploading: %s @ %s", file.name, new Date());
      
      // remove from /tmp
      fs.unlink(file.path);
      
      // parse xml and get download link
      var dlLink = data.match(/<content(.*?)\s*?src='(.*?)'\s*?\/>/)[2];

      downloadFile(dlLink, file.convertFormat);
    });
  }
  
  function downloadFile (dlLink, format) {
    
    var options = {
        host: url.parse(dlLink).host
      , path: url.parse(dlLink).path + '&export=' + format + '&format=' + format
      , headers: {
          "Host": "docs.google.com"
        , "GData-Version": 3
        , "Authorization": "GoogleLogin auth=" + Docs.authToken
      }
    }
    
    https.get(options, function (res) {
      
      var dlFile = sessionPath + '/' + file.alt + '.' + format
        , streamOpts = {
              "flags": "a"
            , "encoding": "null"
            , "mode": 0666
          }
        , ostream = fs.createWriteStream(dlFile, streamOpts);
      
      res.on('data', function (data) {
        ostream.write(data);
      });
      
      res.on('end', function (){
        console.log("Finished: " + new Date());
        var data = 
          { index: file.index
          , link: 'download/' + currentDate + '/'
                  + randomSession.replace(/=/g, '') 
                  + '/' + file.alt + '.' + format
          , name: file.alt
        }

        eventEmitter.emit('uploadComplete', data)
        ostream.end();
      })
      
    });

  }
  
  response.render('index', { title: 'Doccelganger' });
}
