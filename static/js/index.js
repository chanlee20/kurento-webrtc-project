/*
 * (C) Copyright 2014-2015 Kurento (http://kurento.org/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

// var ws = new WebSocket('wss://' + location.host + '/one2many');

///// added lines 
//const express = require('express');
//const app = express();
//const http = require('http');
//const server = http.createServer(app);
//const { Server } = require("socket.io");
//const io = new Server(server);
///// til here


var autoView = true;
var video;
var webRtcPeer;
var room;
var socketio = io.connect();
var webRtc;

var constraints = {
        audio: true,
        video: {
          width: 1280,
          height: 720,
          framerate: 30
        }
    };

socketio.on('connect', function() {
        socketio.emit('addRoom', prompt('Set your room name: '));
});

socketio.on('currentRoom', function(data){
        document.getElementById("current_room").innerHTML = "<p id = 'current_room'> Current Room: " + data + "</p>";
})

socketio.on("updateRooms_presenter", function(data){
        console.log("list of rooms: " + data);
        document.getElementById("all_rooms").innerHTML = "<div id = 'all_rooms'>" + data + "</div>";
    
});


socketio.on('reload', function() {
        console.log('reloading...');
        alert("Room Name Already Exists. Please Try Again.");
        socketio.disconnect();
        window.location.reload();
});

socketio.on('null_reload', function() {
        console.log('reloading...');
        alert("Enter Room Name Please.");
        socketio.disconnect();
});

socketio.on('disconnect', function(){
	console.log('Disconnected from socket');
	dispose();
});

socketio.on('presenterResponse', function(data) {
	presenterResponse(data);
});

// socketio.on('viewerResponse', function(data) {
// 	viewerResponse(data);
// });

socketio.on('stopCommunication', function(data) {
	console.log('stopCommunication');
	dispose();
});

socketio.on('iceCandidate', function(data) {
	webRtcPeer.addIceCandidate(data.candidate)
});

// socketio.on('streamStarted', function(data) {
// 	if (autoView) {
// 		viewer();
// 	}
// });


window.onload = function() {
        console = new Console();
        video = document.getElementById('video');
        videoOutput= document.getElementById('videoOutput');
        room = $('#current_room');
        document.getElementById('call').addEventListener('click', function(e) { presenter(); e.preventDefault(); } );
        // document.getElementById('play').addEventListener('click', function() { play(); } );
        document.getElementById('terminate').addEventListener('click', function() { stop(); } );
}


function play() {
        showSpinner(videoOutput);

        var options = 
        {
                localVideo: video,
                remoteVideo: videoOutput
        }

        webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function(error){
                if(error) return console.error(error);
                this.generateOffer(onOfferPlayer)
        });
}

function onOfferPlayer(error, sdpOffer){
        if(error) return console.error(error);

        var message = {
                sdpOffer: sdpOffer
        };
        socketio.emit('player', message);
}

function presenterResponse(message) {
        if (message.response != 'accepted') {
                var errorMsg = message.message ? message.message : 'Unknow error';
                console.warn('Call not accepted for the following reason: ' + errorMsg);
                dispose();
        } else {
                webRtcPeer.processAnswer(message.sdpAnswer);
                socketio.emit('record');
        }
}

function presenter() {
        if (!webRtcPeer) {
                //generate sdp stream and start video
                showSpinner(video);

                var options = {
                        localVideo: video,
                        remoteVideo: videoOutput,
                        onicecandidate : onIceCandidate
                }

                webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function(error) {
                        if(error) return console.error(error);
                        this.generateOffer(onOfferPresenter);
                });
        }
}
function onOfferPresenter(error, offerSdp) {
        let cur_room = document.getElementById('current_room').value; 
        if (error) return console.error(error);
        console.log('onofferpresenter');
            var message = {
                    sdpOffer : offerSdp,
                    room: cur_room
            };
            socketio.emit('presenter', message);
}


function onIceCandidate(candidate) {
	console.log('Local candidate' + JSON.stringify(candidate));
        socketio.emit('onIceCandidate', {candidate : candidate});
}

function stop() {
        console.log('stop');
 if (webRtcPeer) {
		 var message = {
		        id : 'stop'
		 }
		 sendMessage(message);
		 dispose();
 }
 socketio.emit('release_pipeline');
}

function dispose() {
 if (webRtcPeer) {
		 webRtcPeer.dispose();
		 webRtcPeer = null;
 }
 hideSpinner(video);
}

function sendMessage(message) {
 var jsonMessage = JSON.stringify(message);
 console.log('Sending message: ' + jsonMessage);
//  ws.send(jsonMessage);
}

function showSpinner() {
 for (var i = 0; i < arguments.length; i++) {
		 arguments[i].poster = './img/transparent-1px.png';
		 arguments[i].style.background = 'center transparent url("./img/spinner.gif") no-repeat';
 }
}

function hideSpinner() {
 for (var i = 0; i < arguments.length; i++) {
		 arguments[i].src = '';
		 arguments[i].poster = './img/webrtc.png';
		 arguments[i].style.background = '';
 }
}

/**
* Lightbox utility (to display media pipeline image in a modal dialog)
*/
$(document).delegate('*[data-toggle="lightbox"]', 'click', function(event) {
	event.preventDefault();
	$(this).ekkoLightbox();
});

