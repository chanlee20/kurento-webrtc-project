

/*
 * (C) Copyright 2014-2015 Kurento (http://kurento.org/)
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the GNU Lesser General Public License
 * (LGPL) version 2.1 which accompanies this distribution, and is available at
 * http://www.gnu.org/licenses/lgpl-2.1.html
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 */

var path = require('path');
var url = require('url');
var express = require('express');
var minimist = require('minimist');
var kurento = require('kurento-client');
var fs    = require('fs');
var https = require('https');
//var socketio = require('socket.io'), server, io;
//var socketio = require('socket.io');

var argv = minimist(process.argv.slice(2), {
    default: {
        as_uri: 'https://localhost:8443/',
        ws_uri: 'ws://localhost:8888/kurento',
    }
});

var options =
{
  key:  fs.readFileSync('keys/server.key'),
  cert: fs.readFileSync('keys/server.crt')
};

var app = express();

/*
 * Definition of global variables.
 */
var candidatesQueue = {};
var kurentoClient = null;
var noPresenterMessage = 'No active presenter. Try again later...';
var anotherPresenterIsActive = "Another user is currently acting as presenter. Try again later ...";
let listofRoomsButton = [];
var rooms = [];
let listofMergedRooms = [];

/*
 * Server startup
 */
var asUrl = url.parse(argv.as_uri);
var port = asUrl.port;
var server = https.createServer(options, app);
const io = require('socket.io')(server);
server.listen(port);

//server.listen(port,function(){
  //  console.log('Open ' + url.format(asUrl) + ' with a WebRTC capable browser');
//});


// const socketio = require('socket.io');
// const io = require('socket.io')(server);




/*
 * Rooms related methods
 */

function getRoom(socket) {
        if (rooms[socket.room] == undefined) {
                createRoom(socket.room);
        }
        return rooms[socket.room];
}

function createRoom(room) {
	rooms[room] = {
			room_name: room,
			presenter: null,
			pipeline: null,
			viewers: [],
			chat: []
	};
}


function createButtons() {
	let c = 0;
	let status = true;
	for(let i in rooms){
		console.log("creating buttons ... ");
		let s = "" + i;
		for(let j = 0; j < listofMergedRooms.length; j++){
			console.log(s);
			console.log(listofMergedRooms[j]);
			if(s != listofMergedRooms[j]){
				status = true;
			}
			else{
				status = false;
			}
		}
		if(status == true && s != "undefined"){
			listofRoomsButton[c] = "" + i;
			c++;
		}
	}
	console.log(listofRoomsButton);
}


function joinRoom(socket, data) {
	// leave all other socket.id rooms
	while(socket.rooms.length) {
			socket.leave(socket.rooms[0]);
	}

	// join new socket.io room
	socket.join(data.room);
	socket.room = data.room;

	socket.emit('joinedRoom');

	console.log('Join room: ' + data.room);
}

function newChatMessage(socket, message){
	var message = {message: message, username: socket.username}
	io.in(socket.room).emit('chat:newMessage', message)

	var room = getRoom(socket);
	room.chat.push(message);

	if (room.chat.length > 30)
			room.chat.shift()
}

/*
* Define possible actions which we'll send thru Websocket
*/
function acceptPeerResponse(peerType, sdpAnswer) {
	return {
			id : peerType + 'Response',
			response : 'accepted',
			sdpAnswer : sdpAnswer
	};
}

function rejectPeerResponse(peerType, reason) {
	return {
		id : peerType + 'Response',
		response : 'rejected',
		message : reason
};
}


//no duplicate presenters
function checkDuplicateRooms(socket, roomName) {
	console.log("hi");	
	let duplicate = false;
	if(rooms[roomName] == undefined){
		console.log('all good');
		return duplicate
	}
	else{
		console.log("Room already exists. Please try again.");
		// socket.connect();
		duplicate = true;
		socket.emit('reload');
		return duplicate;
		// Location.reload();
		// stop(socket);
	}
}

// function checkNullRooms(socket, roomName){
// 	console.log(roomName);
// 	console.log('checkNullRooms');
// 	if(roomName == null){
// 		console.log('checkNullRooms2');
// 		socket.emit('null_reload');
// 	}
// }

function arrayRemove(arr, value) { 
    
	return arr.filter(function(ele){ 
		return ele != value; 
	});
}

/*
* Socket pipeline
*/
io.on('connection', function(socket) {
console.log('Connection received with sessionId - ' + socket.id);

socket.on('addRoom', function(roomName) {
	console.log('user created room: ' + roomName);
	if(roomName === null || roomName === undefined){
		console.log("JERE");
		socket.emit('null_reload');
	}
	else {
		if(checkDuplicateRooms(socket, roomName)==false){
			if(roomName != "undefined"){
				createRoom(roomName);
			}
			socket.room = roomName;
			while(socket.rooms.length) {
				socket.leave(socket.rooms[0]);
			}
			socket.join(socket.room);
			rooms[roomName].presenter = socket.id;
			console.log(rooms[roomName]);
			let listofRooms = "";
			for(let i in rooms){
				if(i == "undefined"){
					console.log('it is undefined');
				}
				else{
					console.log(i);
					listofRooms += i + " ";
				}
			}
			createButtons(socket);
			io.sockets.in(socket.room).emit('currentRoom', roomName);
			io.emit('updateRooms_presenter', listofRooms);
			io.emit('updateRooms_viewer', listofRoomsButton);	
		}
		else{
			console.log("it is duplicated");
		}
	}
})

socket.on('Init_joinRoom', function(roomName){
	console.log('user joined room ' + roomName);
// leave all other socket.id rooms
	while(socket.rooms.length) {
		socket.leave(socket.rooms[0]);
	}	
	socket.room = roomName;
	socket.join(roomName);
	rooms[roomName].viewers.push(socket.id);
	console.log(rooms[roomName]);
	createButtons(socket);
	io.emit('updateRooms_viewer', listofRoomsButton);	
	io.sockets.in(socket.room).emit('currentRoom', roomName);
})

socket.on('joinRoom_to_server', function(data){
	let id = socket.id;
	let rn = data["roomname"];
	rooms[socket.room].viewers = arrayRemove(rooms[socket.room].viewers, id);
	console.log(rooms[socket.room]);
	socket.leave(socket.room);
	socket.join(data["roomname"]);
	socket.room = data["roomname"];
	rooms[data["roomname"]].viewers.push(socket.id);
	console.log(id + "joined " + data["roomname"]);
	console.log(rooms[data["roomname"]]);
	io.to(id).emit("currentRoom", rn);
	console.log("SOCKET.ROOM IS " + socket.room);
	console.log("ATTEMPT TO JOIN ROOM" + data["roomname"]);
})

socket.on('join_MergeRoom', function(data){
	let selected_rooms = data["selected_rooms"];
	let id = socket.id;
	let roomname = 'Merged Room ' + id;
	listofMergedRooms.push(roomname);
	let new_presenters = [];
	rooms[socket.room].viewers = arrayRemove(rooms[socket.room].viewers, id);
	socket.leave(socket.room);
	createRoom(roomname);
	socket.room = roomname;
	while(socket.rooms.length) {
		socket.leave(socket.rooms[0]);
	}
	socket.join(socket.room);
	rooms[roomname].viewers.push(id);

	for(let i = 0; i < selected_rooms.length; i++){
		new_presenters[i] = rooms[selected_rooms[i]].presenter;
	}
	rooms[roomname].presenter = new_presenters;
	io.to(id).emit("currentRoom", selected_rooms);
	io.to(id).emit("updateRooms_mergeViewer", roomname);	
	console.log("SELECTED ROOMS: "+ selected_rooms);
	console.log("current room is " + socket.room);
	console.log(rooms[roomname].presenter);
	console.log("viewer is " + rooms[roomname].viewers);
})

socket.on('error', function(error) {
console.error('Connection ' + socket.id + ' error', error);
stop(socket);
// stop(socket);
});

socket.on('disconnect', function() {
console.log('Connection ' + socket.id + ' closed');
stop(socket);
});

socket.on('release_pipeline', function() {
	room = getRoom(socket);
	if(room.pipeline){
		room.pipeline.release();
		room.pipeline = null;
	}
})

// Handle events from clients
socket.on('player', function(data){
	console.log("pressed player");
	startPlayer(socket, data.sdpOffer, function(error, sdpAnswer){
		var response = (error) ? rejectPeerResponse('player', error) : acceptPeerResponse('player', sdpAnswer);
		socket.emit(response.id, response);
		if (!error) {
				console.log(socket.id + ' starting playing to ' + socket.room + ' room');
				// socket.broadcast.emit('streamStarted');
		}	
	});
})

socket.on('presenter', function (data) {
	console.log("pressed presenter");
	console.log(rooms[socket.room]);
		startPresenter(socket, data.sdpOffer, function(error, sdpAnswer) {
				var response = (error) ? rejectPeerResponse('presenter', error) : acceptPeerResponse('presenter', sdpAnswer);
				socket.emit(response.id, response);
				if (!error) {
						console.log(socket.id + ' starting publishing to ' + socket.room + ' room');
						// socket.broadcast.emit('streamStarted');
				}
		});
});

socket.on('viewer', function (data){
		console.log("pressed viewer");
		startViewer(socket, data.sdpOffer, function(error, sdpAnswer) {
				response = (error) ? rejectPeerResponse('viewer', error) : acceptPeerResponse('viewer', sdpAnswer);
				socket.emit(response.id, response);
		});
});

socket.on('merged_viewer', function (data){
	console.log("pressed merged viewer");
	startMergedViewer(socket, data.sdpOffer, data.access_room, function(error, sdpAnswer) {
			response = (error) ? rejectPeerResponse('merged_viewer', error) : acceptPeerResponse('merged_viewer', sdpAnswer);
			socket.emit(response.id, response);
	});
});

socket.on('stop', function(){
		stop(socket);
});

socket.on('onIceCandidate', function (data){
		onIceCandidate(socket, data.candidate);
});

socket.on('onIceCandidate2', function (data){
	onIceCandidate2(socket, data.candidate);
});

socket.on('subscribeToStream', function (data){
	joinRoom(socket, data);
	var room = getRoom(socket);
	if (room.presenter) {
			socket.emit('streamStarted');
	}
});

socket.on('joinRoom', function (data){
	joinRoom(socket, data)
});


// Chat methods
socket.on('chat:newMessage', function(message) {
	newChatMessage(socket, message);
});

socket.on('record', function() {
	record(socket);
})

socket.on('chat:loadMessages', function() {
	var room = getRoom(socket);

	socket.emit('chat:messages', room.chat);
});
});



/*
* Definition of functions
*/

// Recover kurentoClient for the first time.
function getKurentoClient(callback) {
	//instantiate kurentoclient (ready for communicating with kurento media server)
	if (kurentoClient !== null) {
		return callback(null, kurentoClient);
	}

	kurento(argv.ws_uri, function(error, _kurentoClient) {
	if (error) {
	console.log("Could not find media server at address " + argv.ws_uri);
	return callback("Could not find media server at address" + argv.ws_uri
			+ ". Exiting with error " + error);
	}

	kurentoClient = _kurentoClient;
	callback(null, kurentoClient);
	});
}

function startPlayer(socket, sdpOffer, callback){
	clearCandidatesQueue(socket);
	room = getRoom(socket);
	getKurentoClient(function(error, kurentoClient){
		if(error){
			stop(socket);
			return callback(error);
		}

		var player = room.pipeline.create('PlayerEndpoint', {uri: argv.file_uri}); 
		player.on('EndOfStream', stop);
		player.connect(room.presenter.webRtcEndpoint, function(error) {
			if (error) {
				stop(socket.id);
				return callback(error);
			}
			console.log(player);
			player.play();
		})

	})
}

function startPresenter(socket, sdpOffer, callback) {
	clearCandidatesQueue(socket);

	var room = getRoom(socket);

	room.presenter = {
			webRtcEndpoint : null,
			id: socket.id
	};

	getKurentoClient(function(error, kurentoClient) {
			if (error) {
					stop(socket);
					return callback(error);
			}

			if (room.presenter === null) {
					stop(socket);
					return callback(noPresenterMessage);
			}

			kurentoClient.create('MediaPipeline', function(error, pipeline) {
					if (error) {
							stop(socket);
							return callback(error);
					}

					if (room.presenter === null) {
							stop(socket);
							return callback(noPresenterMessage);
					}

					room.pipeline = pipeline;
					pipeline.create('WebRtcEndpoint', function(error, webRtcEndpoint) {
							if (error) {
									stop(socket);
									return callback(error);
							}

							if (room.presenter === null) {
									stop(socket);
									return callback(noPresenterMessage);
							}

							room.presenter.webRtcEndpoint = webRtcEndpoint;
							console.log('here');
							console.log(room.presenter.webRtcEndpoint);
							console.log(room.pipeline);

							if (candidatesQueue[socket.id]) {
								console.log("OMG ");
								while(candidatesQueue[socket.id].length) {
									var candidate = candidatesQueue[socket.id].shift();
									console.log(candidate);
									webRtcEndpoint.addIceCandidate(candidate);
								}
							}

							webRtcEndpoint.on('OnIceCandidate', function(event) {
								var candidate = kurento.register.complexTypes.IceCandidate(event.candidate);
								socket.emit('iceCandidate', { candidate : candidate });
							});

							webRtcEndpoint.processOffer(sdpOffer, function(error, sdpAnswer) {
								if (error) {
									stop(socket);
									return callback(error);
								}

								if (room.presenter === null) {
									stop(socket);
									return callback(noPresenterMessage);
								}

								callback(null, sdpAnswer);
							});

							webRtcEndpoint.gatherCandidates();
			});
		});

		
		// room.presenter.webRtcEndpoint.connect(recorder);
	});
}

function record(socket) {
	room = getRoom(socket);
	argv.file_uri = 'file:///tmp/' + room.room_name + '.webm';
	var recorder = room.pipeline.create('RecorderEndpoint', {uri: argv.file_uri});
		console.log(room.presenter.webRtcEndpoint);
		room.presenter.webRtcEndpoint.connect(recorder, function(error) {
			if (error) {
					stop(socket.id);
					return callback(error);
			}
			if (room.presenter === null) {
					stop(socket.id);
					return callback(noPresenterMessage);
			}
			recorder.record();
		});
		console.log(recorder);
}

function startViewer(socket, sdpOffer, callback) {
	clearCandidatesQueue(socket);
	room = getRoom(socket);
	console.log( room);

	if (room.presenter === null) {
			stop(socket);
			return callback(noPresenterMessage);
	}

	room.pipeline.create('WebRtcEndpoint', function(error, webRtcEndpoint) {
			if (error) {
					stop(socket);
					return callback(error);
				}
                room.viewers[socket.id] = {
                        "webRtcEndpoint" : webRtcEndpoint,
                        "socket" : socket
                };
				console.log(webRtcEndpoint);
                if (room.presenter === null) {
                        stop(socket);
                        return callback(noPresenterMessage);
                }
                if (candidatesQueue[socket.id]) {
                        while(candidatesQueue[socket.id].length) {
                                var candidate = candidatesQueue[socket.id].shift();
								console.log(candidate);
                                webRtcEndpoint.addIceCandidate(candidate);
                        }
                }

			webRtcEndpoint.on('OnIceCandidate', function(event) {
				var candidate = kurento.register.complexTypes.IceCandidate(event.candidate);
							socket.emit('iceCandidate', { candidate : candidate });
			});

                webRtcEndpoint.processOffer(sdpOffer, function(error, sdpAnswer) {
                        if (error) {
                                stop(socket.id);
                                return callback(error);
                        }
                        if (room.presenter === null) {
                                stop(socket.id);
                                return callback(noPresenterMessage);
                        }

                        room.presenter.webRtcEndpoint.connect(webRtcEndpoint, function(error) {
                                if (error) {
                                        stop(socket.id);
                                        return callback(error);
                                }
                                if (room.presenter === null) {
                                        stop(socket.id);
                                        return callback(noPresenterMessage);
                                }

                                callback(null, sdpAnswer);
								webRtcEndpoint.gatherCandidates();


					});
				});
			});
	}

	function startMergedViewer(socket, sdpOffer, access_room, callback) {

		let r1 = rooms[access_room];
		room = getRoom(socket);
		console.log(r1.pipeline);
		room.presenter = r1.presenter; 
		room.pipeline = r1.pipeline;
		clearCandidatesQueue(socket);
		console.log(room);
		console.log(r1);
		if (room.presenter === null) {
				stop(socket);
				return callback(noPresenterMessage);
		}
	
		room.pipeline.create('WebRtcEndpoint', function(error, webRtcEndpoint) {
				if (error) {
						stop(socket);
						return callback(error);
					}
					room.viewers[socket.id] = {
							"webRtcEndpoint" : webRtcEndpoint,
							"socket" : socket
					};
					console.log(webRtcEndpoint);
					if (room.presenter === null) {
							stop(socket);
							return callback(noPresenterMessage);
					}
					if (candidatesQueue[socket.id]) {
						console.log("OMG2!!!!!");
							while(candidatesQueue[socket.id].length) {
									var candidate = candidatesQueue[socket.id].shift();
									console.log(candidate);
									webRtcEndpoint.addIceCandidate(candidate);
							}
					}
	
				webRtcEndpoint.on('OnIceCandidate', function(event) {
					var candidate = kurento.register.complexTypes.IceCandidate(event.candidate);
								socket.emit('iceCandidate', { candidate : candidate });
				});
	
					webRtcEndpoint.processOffer(sdpOffer, function(error, sdpAnswer) {
							if (error) {
									stop(socket.id);
									return callback(error);
							}
							if (room.presenter === null) {
									stop(socket.id);
									return callback(noPresenterMessage);
							}
	
							room.presenter.webRtcEndpoint.connect(webRtcEndpoint, function(error) {
									if (error) {
											stop(socket.id);
											return callback(error);
									}
									if (room.presenter === null) {
											stop(socket.id);
											return callback(noPresenterMessage);
									}
	
									callback(null, sdpAnswer);
									webRtcEndpoint.gatherCandidates();
	
	
						});
					});
				});
		}
	

	function clearCandidatesQueue(socket) {
			if (candidatesQueue[socket.id]) {
					delete candidatesQueue[socket.id];
			}
	}
	
	function stop(socket) {
			var room = getRoom(socket);
	
			if (room.presenter !== null && room.presenter.id == socket.id) {
					stopPresenter(socket);
			} else if (room.viewers[socket.id]) {
					stopViewing(socket);
			}
	}
	
	function stopPresenter(socket){
			var room = getRoom(socket);
			var viewers = room.viewers;
	
			for (var i in viewers) {
					var viewer = viewers[i];
					if (viewer.socket) {
							clearCandidatesQueue(socket);
							viewer.webRtcEndpoint.release();
							viewer.socket.emit('stopCommunication');
					}
			}
	
			room.presenter.webRtcEndpoint.release();
			room.presenter = null;
			room.viewers = [];
	}
	
	function stopViewing(socket){
			var room = getRoom(socket);
	
			clearCandidatesQueue(socket.id);
			room.viewers[socket.id].webRtcEndpoint.release();
			delete room.viewers[socket.id];
	}
	
	function onIceCandidate(socket, _candidate) {
			var room = getRoom(socket);
			var candidate = kurento.register.complexTypes.IceCandidate(_candidate);
			console.log(candidate);
			if (room.presenter && room.presenter.id === socket.id && room.presenter.webRtcEndpoint) {
				console.info('Sending presenter candidate');
				room.presenter.webRtcEndpoint.addIceCandidate(candidate);
				// if(m_room.presenter){
				// 	m_room.presenter.webRtcEndpoint.addIceCandidate(candidate);
				// }
			}
			else if (room.viewers[socket.id] && room.viewers[socket.id].webRtcEndpoint) {
				console.info('Sending viewer candidate');
				room.viewers[socket.id].webRtcEndpoint.addIceCandidate(candidate);
			}
			else {
				console.info('Queueing candidate');
				if (!candidatesQueue[socket.id]) {
					console.log('REALLLY!');
					candidatesQueue[socket.id] = [];
				}
				candidatesQueue[socket.id].push(candidate);
				
			}
		}

		function onIceCandidate2(socket, _candidate) {
			console.log('onice2');
			let m_room = rooms['r1'];
			var room = getRoom(socket);
			var candidate = kurento.register.complexTypes.IceCandidate(_candidate);
			console.log("RN!");
			if (room.presenter && room.presenter.id === socket.id && room.presenter.webRtcEndpoint) {
				console.info('Sending presenter candidate');
				room.presenter.webRtcEndpoint.addIceCandidate(candidate);
			}
			else if (m_room.viewers[socket.id] && m_room.viewers[socket.id].webRtcEndpoint) {
				console.info('Sending viewer candidate');
				console.log(candidate);
				m_room.viewers[socket.id].webRtcEndpoint.addIceCandidate(candidate);
			}
			else {
				console.info('Queueing candidate');
				if (!candidatesQueue[socket.id]) {
					console.log('REALLLY!');
					candidatesQueue[socket.id] = [];
				}
				candidatesQueue[socket.id].push(candidate);
			}
		}
		
		app.use(function (req, res, next) {
				// Website you wish to allow to connect
				res.setHeader('Access-Control-Allow-Origin', '*');
		
				next();
		});
		
		app.use(express.static(path.join(__dirname, 'static')));
		
