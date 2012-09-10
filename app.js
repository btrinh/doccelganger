
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , events = require('events')
  , eventEmitter = new events.EventEmitter()

var app = module.exports = express.createServer()

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('view options', { pretty: true });
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.methodOverride());
  app.use(express.compiler({ src: __dirname + '/public', enable: ['less']}))
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes
app.get('/', function (req, res) {
  routes.index(req, res, eventEmitter);
});
app.post('/upload', function (req, res) {
  routes.upload(req, res, eventEmitter);
});

app.listen(process.env.PORT || 5000);
console.log("Port %d | %s mode", app.address().port, app.settings.env);

var io = require('socket.io').listen(app)
  , clients = []

// io config
io.set('log level', 1)


io.sockets.on('connection', function (client) {
  clients.push(client)
  
  // send upload meta data
  eventEmitter.on('uploadComplete', function (data) {
    io.sockets.socket(client.id).emit('uploadComplete', data)
  })
  
  // send client.id, ip.address
  io.sockets.socket(client.id).emit('clientInfo', 
                                  { id: client.id
                                  , ip: client.handshake.address.address 
                                  })
});
//*/
