/* 
  Module dependencies:

  - Express
  - Http (to run Express)
  - Body parser (to parse JSON requests)
  - Underscore (because it's cool)
  - Socket.IO

  It is a common practice to name the variables after the module name.
  Ex: http is the "http" module, express is the "express" module, etc.
  The only exception is Underscore, where we use, conveniently, an 
  underscore. Oh, and "socket.io" is simply called io. Seriously, the 
  rest should be named after its module name.

*/
var express = require("express")
  , app = express()
  , http = require("http").createServer(app)
  , bodyParser = require("body-parser")
  , io = require("socket.io").listen(http)
  , _ = require("underscore");

/* 
  The list of ctMessages in our chatroom.
  The format of each participant will be:
  {
    name: "name",
    message: "message",
    time: "time"
  }
*/
var ctMessages = [];


/*
initial database 
*/

var fs = require("fs");
var file = "chatroom.db";
var exists = fs.existsSync(file);
if(!exists) {
  console.log("Creating DB file");
  fs.openSync(file,"w");
}
var sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database(file);

db.serialize(function() {
  if(!exists) {
    db.run("CREATE TABLE chat_message (name TEXT, message TEXT, time TEXT)");
  }
  db.each("SELECT name, message, time FROM chat_message ORDER BY rowid", function(err, row) {
    if(err) console.log('error in reading database' + err);
    ctMessages.push({name: row.name, message:row.message, time: row.time});
  });

})


/* 
  The list of participants in our chatroom.
  The format of each participant will be:
  {
    id: "sessionId",
    name: "participantName"
  }
*/
var participants = [];



/* Server config */

//Server's IP address
app.set("ipaddr", "127.0.0.1");

//Server's port number 
app.set("port", 8080);

//Specify the views folder
app.set("views", __dirname + "/views");

//View engine is Jade
app.set("view engine", "jade");

//Specify where the static content is
app.use(express.static("public", __dirname + "/public"));

//Tells server to support JSON requests
app.use(bodyParser.json());

/* Server routing */

//Handle route "GET /", as in "http://localhost:8080/"
app.get("/", function(request, response) {

  // Render the view called "index"  //default "index.jade"
  // response.sendfile(__dirname + '/views/index   .html');
  response.render("index");

});

//POST method to create a chat message
app.post("/message", function(request, response) {

  //The request body expects a param named "message"
  var message = request.body.message;

  //If the message is empty or wasn't sent it's a bad request
  if(_.isUndefined(message) || _.isEmpty(message.trim())) {
    return response.json(400, {error: "Message is invalid"});
  }

  //We also expect the sender's name and time with the message
  var name = request.body.name;
  var time = request.body.time;

  //insert a new message into the database
  var stmt = db.prepare("INSERT INTO chat_message VALUES (?,?,?)");
  console.log("name: " + name + " message: " + message + " time: " + time);
  stmt.run( name, message, time);
  stmt.finalize();
  //put this message into the ctMessages, so when a new client connected to the server
  // it will soon get the messages from the server;
  ctMessages.push({name:name,message:message,time:time});

  //Let our chatroom know there was a new message
  io.sockets.emit("incomingMessage", {message: message, name: name, time: time});

  //Looks good, let the client know
  response.json(200, {message: "Message received"});

});

/* Socket.IO events */
io.on("connection", function(socket){

  /*
    When a new user connects to our server,  "newUser" will be trigered
    and then we'll emit "Add A Server ", "Load History Messages" events to the client
  */
  socket.on("newUser", function(data) {
    participants.push({id: data.id, name: data.name});
    io.sockets.emit("Load History Messages",{ctMessages:ctMessages});
    io.sockets.emit("Add A User", {participants: participants});
  });

  /*
    When a user changes his name, we are expecting an event called "nameChange" 
    and then we'll emit an event called "nameChanged" to all participants with
    the id and new name of the user who emitted the original message
  */
  socket.on("nameChange", function(data) {
    _.findWhere(participants, {id: socket.id}).name = data.name;
    io.sockets.emit("nameChanged", {id: data.id, name: data.name});
  });

  /* 
    When a client disconnects from the server, the event "disconnect" is automatically 
    captured by the server. It will then emit an event called "userDisconnected" to 
    all participants with the id of the client that disconnected
  */
  socket.on("disconnect", function() {
    participants = _.without(participants,_.findWhere(participants, {id: socket.id}));
    io.sockets.emit("userDisconnected", {id: socket.id, sender:"system"});
  });

});

//Start the http server at port and IP defined before
http.listen(app.get("port"), app.get("ipaddr"), function() {
  console.log("Server is listening to http://" + app.get("ipaddr") + ":" + app.get("port"));
});