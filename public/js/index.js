function init() {

  var serverBaseUrl = document.domain;

  /* 
   On client init, try to connect to the socket.IO server.
  */
  var socket = io.connect(serverBaseUrl);

  //save our session ID in a variable for later
  var sessionId = '';

  //Helper funciton to list the history chat messages;
  function listHistoryMessage(ctMessages) {
    for (var i = 0; i < ctMessages.length ; i++ ) {
      
      $('#messages').prepend(' <b>' + ctMessages[i].name + '&nbsp;&nbsp;&nbsp;&nbsp;' + ctMessages[i].time +'</b><br />' + ctMessages[i].message + '<hr>');
      // $('#messages').append('</div> ');
    }
    
  }

  //Helper function to update the participants' list
  function updateParticipants(participants) {
   $('#participants').html('');
   for (var i = 0; i < participants.length; i++) {
      $('#participants').append('<span id="' + participants[i].id + '">' +
        participants[i].name + ' ' + (participants[i].id === sessionId ? '(You)' : '') + '<br /></span>');
    } 
  }

  /*
 When the client successfully connects to the server, an
 event "connect" is emitted. Let's get the session ID and
 log it. Also, let the socket.IO server there's a new user
 with a session ID and a name. We'll emit the "newUser" event
 for that. 
  */
  socket.on('connect', function () {
    sessionId = socket.io.engine.id;
    console.log('Connected ' + sessionId);
    socket.emit('newUser', {id: sessionId, name: $('#name').val()});
  });
  
/*
 When the server emits the "Load History Message" event, client 
 will list the History message in the pane;
  */
  socket.on('Load History Messages', function(data) {
    listHistoryMessage(data.ctMessages);
  });


  /*
 When the server emits the "Add a User" event, we'll reset
 the participants section and display the connected clients. 
 Note we are assigning the sessionId as the span ID.
  */
  socket.on('Add A User', function (data) {    
    updateParticipants(data.participants);
  });

  /*
 When the server emits the "userDisconnected" event, we'll
 remove the span element from the participants element
  */
  socket.on('userDisconnected', function(data) {
    $('#' + data.id).remove();
  });

  /*
 When the server fires the "nameChanged" event, it means we
 must update the span with the given ID accordingly
  */
  socket.on('nameChanged', function (data) {
    $('#' + data.id).html(data.name + ' ' + (data.id === sessionId ? '(You)' : '') + '<br />');
  });

  /*
 When receiving a new chat message with the "incomingMessage" event,
 we'll prepend it to the messages section
  */
  socket.on('incomingMessage', function (data) {
    var message = data.message;
    var name = data.name;
    var time = data.time;
    $('#messages').prepend('<b>' + name + '&nbsp;&nbsp;&nbsp;&nbsp;' + time +'</b><br />' + message + '<hr>');
  });

  /*
 Log an error if unable to connect to server
  */
  socket.on('error', function (reason) {
    console.log('Unable to connect to server', reason);
  });

  /*
 "sendMessage" will do a simple ajax POST call to our server with
 whatever message we have in our textarea
  */
  function sendMessage() {
    var outgoingMessage = $('#outgoingMessage').val();
    var name = $('#name').val();
    var mDate = new Date();
    var messageTime = (mDate.getMonth() + 1) + '.' + mDate.getDate() + ' ' + mDate.toLocaleTimeString();
    console.log(messageTime);
    $.ajax({
      url:  '/message',
      type: 'POST',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify({message: outgoingMessage, name: name, time: messageTime})
    });
  }

  /*
 If user presses Enter key on textarea, call sendMessage if there
 is something to share
  */
  function outgoingMessageKeyDown(event) {
    if (event.which == 13) {
      event.preventDefault();
      if ($('#outgoingMessage').val().trim().length <= 0) {
        return;
      }
      sendMessage();
      $('#outgoingMessage').val('');
    }
  }

  /*
 Helper function to disable/enable Send button
  */
  function outgoingMessageKeyUp() {
    var outgoingMessageValue = $('#outgoingMessage').val();
    $('#send').attr('disabled', (outgoingMessageValue.trim()).length > 0 ? false : true);
  }

  /*
 When a user updates his/her name, let the server know by
 emitting the "nameChange" event
  */
  function nameFocusOut() {
    var name = $('#name').val();
    socket.emit('nameChange', {id: sessionId, name: name});
  }

  /* Elements setup */
  $('#outgoingMessage').on('keydown', outgoingMessageKeyDown);
  $('#outgoingMessage').on('keyup', outgoingMessageKeyUp);
  $('#name').on('focusout', nameFocusOut);
  $('#send').on('click', sendMessage);

}

$(document).on('ready', init);