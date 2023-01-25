/*
 * (C) Copyright 2014-2015 Kurento (http://kurento.org/)
 *
 * Lnsed under the Apache License, Version 2.0 (the "License");
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






var video;
var webRtcPeer;
var autoView = true;
var room;
let cur_room;
let bestLayout = {area: 0, width: 0, height: 0, rows: 0, cols: 0};
let mergedRoomName;
var target;
let webRtcPeerList = [];


window.onload = function() {
        console = new Console();
        video = document.getElementById('myVideo');
        
        room = $('#current_room');
        document.getElementById('viewer').addEventListener('click', function(e) {viewer(); e.preventDefault();});
        document.getElementById('terminate').addEventListener('click', function() { stop(); } );
        document.getElementById('selectQuality').addEventListener('change', function() {
                changeVidQuality();
        });
        let reset = document.getElementById('reset');
        reset.disabled = true;
        document.getElementById('reset').addEventListener('click', function() {
                toGallery();
        })
}

function clickVideo(video_to_zoom) {
        let allVideos = document.getElementsByClassName('videos');
        let bigVideos = document.getElementById('videoBig');
        let smallVideos_id = document.getElementById('small_videos');
        let smallVideos_class = document.getElementsByClassName('small_videos');
        console.log('clicking vid');
        // console.log(smallVideos_class);
        // if(smallVideos_class[0]){
        //         console.log('AHAHAHAH');
        //         for(let i = 0; i < smallVideos_class.length; i++){
        //                 let el = document.getElementById(smallVideos_class[i].id);
        //                 bigVideos.appendChild(el);
        //         }
        // }
                
        
        for(let i = 0; i < allVideos.length; i++){
                console.log(allVideos[i].id);
                if(allVideos[i].id != video_to_zoom.id) {
                        smallVideos_id.appendChild(document.getElementById(allVideos[i].id));
                }
                else{
                        video_to_zoom.style.width = "800px";
                        video_to_zoom.style.height = "800px";
                }
        }
}

var socketio = io.connect();
socketio.on('connect', function() {
        socketio.emit('Init_joinRoom', prompt('Join room name: '));
});

socketio.on('currentRoom', function(data){
        cur_room = data;
        console.log('current room is ' + data);
        document.getElementById("current_room").innerHTML = "<p id = 'current_room'> Current Room: " + data + "</p>";
});

socketio.on("updateRooms_viewer", function(data){
    document.getElementById("all_rooms").innerHTML = "";
    document.getElementById("channels").innerHTML = "";
        console.log(data);
    for(let i = 0; i < data.length; i++) {
        console.log("list of rooms: " + data[i]);
        document.getElementById("all_rooms").innerHTML += '<button class = "listofRooms" onclick = "joinRoom(\''+data[i]+'\')"  id = ' + data[i] + '>' + data[i] + '</button>';
        let x = document.createElement("input");
        x.setAttribute("type", "checkbox");
        x.setAttribute("id", "merge_"+data[i]);
        x.setAttribute("value", data[i]);
        document.getElementById("channels").appendChild(x);
        // document.getElementById("channels").innerHTML += '<input type = "checkbox" id = ' + data[i] + ' value = ' + data[i] + '> <label for=' + data[i] + '>' + data[i] + '</label>'; 
    }
    document.getElementById('merge_button').innerHTML = '<button id = "merge_button1"> merge </button>';

    document.getElementById('merge_button1').addEventListener('click', function(){
        mergeRoom(data);
    })

});

socketio.on("updateRooms_mergeViewer", function(data){
        mergedRoomName = data;
        document.getElementById("merged_room").innerHTML = "";
        document.getElementById("merged_room").innerHTML += '<button class = "m_rooms" onclick = "joinRoom(\''+data+'\')"  id = ' + mergedRoomName + ' value = ' + mergedRoomName + '>' + data + '</button>';
})



socketio.on('disconnect', function(){
	console.log('Disconnected from socket');
	dispose();
});

socketio.on('presenterResponse', function(data) {
	presenterResponse(data);
});

socketio.on('viewerResponse', function(data) {
        console.log('viewer response');
	viewerResponse(data);
});

socketio.on('merged_viewerResponse', function(data) {
        console.log('MERGE RESPOND!');
	viewerMergedResponse(data);
});


socketio.on('stopCommunication', function(data) {
	console.log('stopCommunication');
	dispose();
});

socketio.on('iceCandidate', function(data) {
	webRtcPeer.addIceCandidate(data.candidate)
});

socketio.on('streamStarted', function(data) {
	if (autoView) {
		viewer();
	}
});

function changeVidQuality() {
        console.log('Changing Resolution');
//         var chosenVidQuality       = $('#selectQuality').val();
//         var trulycompletevideolink = document.getElementById("video").src;
//         console.log(trulycompletevideolink);
//         var step1                  = document.getElementById("video").src.split("_q_");
//         console.log("hi" + step1[0]);
//         console.log("hii" + step1[1]);
//         //COMMENT: step1[0] is the url from start and including the first part of the filename (not the "_q_"-part and the format)
//         var upToVidName            = step1[0];
//         //COMMENT: step1[1] is the resolution and format, e.g. 320.ogg
//         var step2                  = step1[1].split(".");
//         //COMMENT: step2[0] is the resoltion e.g. 720 ,step2[1] is the format (without the dot in front of the format type) e.g. ogg
//         var vidresolution = step2[0];
//         var vidformat = step2[1];
//         vidresolution = chosenVidQuality;
//         var result = upToVidName + "_q_" + vidresolution + "." + vidformat;
//          $('#video1').attr('src', result);
//          $('#video1V').attr('data-caption', vidresolution+" OGG");
//          $('#video1V').load();
//       window.alert("video1 attr src:"+document.getElementById("video1").src); 
//shows updated URL
 }


 function changeLayout() {
        console.log('changing layout');
        let allVideos = document.getElementsByClassName('videos');
        console.log(allVideos.length);

        let layout = document.getElementById('selectLayout').value;
        console.log(layout);
        if(layout == "gallery") {
                toGallery();
        }
        else{
                toSpeakerView(allVideos);
        }
 }

function toSpeakerView(allVideos){
        let vidList = document.getElementById('sv');
        vidList.innerHTML = "";
        for(let i = 0; i < allVideos.length; i++){
                let text = allVideos[i].id;
                let entry = document.createElement('button');
                entry.setAttribute('id', 'btn '+i);
                entry.setAttribute('class', 'sv_btn');
                entry.appendChild(document.createTextNode(text));
                vidList.appendChild(entry);
        }
        let entry_class = document.getElementsByClassName('sv_btn');
        for(let i = 0; i < allVideos.length; i++){
                entry_class[i].addEventListener('click', function() {
                        focusVideo(entry_class[i].textContent, entry_class[i].id);
                });
        }
        let current = document.getElementById('btn 0');
        current.disabled = true;
        focusVideo(allVideos[0].id, current.id);
}

function focusVideo(vid_id, btn_id) {
        console.log(vid_id);
        console.log(btn_id);
        //click한 video id는 보여주고, button id는 disable
        //click안되면 video 끄고, button은 able
        let entry_class=document.getElementsByClassName('sv_btn');
        let allVideos = document.getElementsByClassName('videos');
        for(let i = 0; i < allVideos.length; i++){
                //id = camera r1
                if(vid_id != allVideos[i].id){
                        document.getElementById(allVideos[i].id).style.display = 'none';
                        document.getElementById(entry_class[i].id).disabled = false;
                }
                else{
                        document.getElementById(vid_id).style.display = 'block';
                        document.getElementById(btn_id).disabled = true;
                }
        } 
}

function toGallery() {
        let allVideos = document.getElementsByClassName("videos");
        let videoCount = allVideos.length;
        let vidList = document.getElementById('sv');
        vidList.innerHTML = "";
        let smallVideos = document.getElementsByClassName("small_videos");
        for(let i = 0; i < smallVideos.length; i++){
                  smallVideos[i]
        }
        let layout = calculateBestArea(videoCount);
        console.log(layout.height);
        for(let i = 1; i < allVideos.length; i++){
                allVideos[i].style.display = 'block';
                allVideos[i].addEventListener('dblclick', function() {
                        clickVideo(allVideos[i]);
                })
        }
        let allContainers = document.getElementsByClassName('video-container');
        for(let i = 0; i < allVideos.length; i++){
                allVideos[i].style.height = layout['height'] + "px";
                allVideos[i].style.width = layout['width'] + "px";
        }
        for(let i = 0; i < allContainers.length; i++){
                allContainers[i].style.height = layout['height'] + "px";
        }
}

function calculateBestArea(videoCount) {
        const aspectRatio = 16/9;
        let gallery = document.getElementById('videoBig');
        console.log(gallery);
        let containerWidth = gallery.getBoundingClientRect().width;
        let containerHeight = gallery.getBoundingClientRect().height;
        console.log(containerWidth);
        console.log(containerHeight);
        for(let cols = 1; cols <= videoCount; cols++){
                let rows = Math.ceil(videoCount/cols);
                let hScale = containerWidth / (cols*aspectRatio);
                let vScale = containerHeight / rows;
                let width;
                let height;
                if (hScale <= vScale) {
                        console.log(cols);
                        width = Math.floor(containerWidth / cols);
                        height = Math.floor(width / aspectRatio);
                }
                else{
                        console.log(cols);
                        height = Math.floor(containerHeight / rows);
                        width = Math.floor(height*aspectRatio);
                }
                const area = width * height;
                console.log(area)
                if ( area > bestLayout.area){
                        console.log('layout');
                        bestLayout.area = area;
                        bestLayout.width = width;
                        bestLayout.height = height;
                        bestLayout.rows = rows;
                        bestLayout.cols = cols;
                }
        }
        return bestLayout;

}

function joinRoom(rn) {
        console.log("ATTEMPT TO JOIN " + rn);
        let listofRooms = document.getElementsByClassName('listofRooms');
        if(rn == mergedRoomName){
                console.log('IM N MERGED ROOM');
                document.getElementById('reset').disabled = false;
                //let x = document.getElementById('video');
                let y = document.getElementById('viewer');
                y.style.visibility = 'hidden';
                let t = document.getElementById('terminate');
                t.style.visibility = 'hidden';
                let allVideos = document.getElementsByClassName('videos');
                for(let i = 1; i < allVideos.length; i++){
                        document.getElementById(allVideos[i].id).style.display = 'block';
                }
                for(let i = 0; i < listofRooms.length; i++){
                        let merge_viewer_btn = document.getElementById('merged_viewer_btn ' + listofRooms[i].id);
                        if(merge_viewer_btn){
                                merge_viewer_btn.style.visibility = 'visible';
                        }
                        let terminate_btn = document.getElementById("terminate " + listofRooms[i].id);
                        if(terminate_btn){
                                terminate_btn.style.visibility = 'visible';
                        }

                }
                video.style.display = 'none';
        }
        else{
                console.log('not merged room');
                document.getElementById('reset').disabled = true;
                let y = document.getElementById('viewer');
                y.style.visibility = 'visible';
                let t = document.getElementById('terminate');
                t.style.visibility = 'visible';
                let allVideos = document.getElementsByClassName('videos');
                for(let i = 0; i < allVideos.length; i++){
                        allVideos[i].style.display = 'none';                        
                }
                for(let i = 0; i < listofRooms.length; i++){
                        let merge_viewer_btn = document.getElementById("merged_viewer_btn " + listofRooms[i].id);
                        let terminate_btn = document.getElementById("terminate " + listofRooms[i].id);
                        if(merge_viewer_btn != null){
                                merge_viewer_btn.style.visibility = 'hidden';
                        }
                        if(terminate_btn != null){
                                terminate_btn.style.visibility = 'hidden';
                        }
                }
                video.style.display = 'block';
        }
        
        socketio.emit("joinRoom_to_server", {
                roomname: rn
        });
}

function presenterResponse(message) {
        if (message.response != 'accepted') {
                var errorMsg = message.message ? message.message : 'Unknow error';
                console.warn('Call not accepted for the following reason: ' + errorMsg);
                dispose();
        } else {
                webRtcPeer.processAnswer(message.sdpAnswer);
        }
}

function viewerResponse(message) {
        console.log("VIEWER RESPONSE");
        if (message.response != 'accepted') {
                var errorMsg = message.message ? message.message : 'Unknow error';
                console.warn('Call not accepted for the following reason: ' + errorMsg);
                dispose();
        } else {
                webRtcPeer.processAnswer(message.sdpAnswer);
                console.log(video.src);
        }
}

function viewerMergedResponse(message) {
        console.log("MERGED VIEWER RESPONSE");
        if (message.response != 'accepted') {
                var errorMsg = message.message ? message.message : 'Unknow error';
                console.warn('Call not accepted for the following reason: ' + errorMsg);
                dispose();
        } else {
                console.log('response good');
                webRtcPeer.processAnswer(message.sdpAnswer, function(error){
                        if(error) return console.error(error);
                });
        }
}

function mergeRoom(data) {
        let v = document.getElementById('myVideo');
        v.style.display = 'none';
        let y = document.getElementById('viewer');
        y.style.visibility = 'hidden';
        let t = document.getElementById('terminate');
        t.style.visibility = 'hidden';
        document.getElementById('reset').disabled = false;

        
        let allVideos = document.getElementsByClassName('videos');
        let length = allVideos.length;
        for(let i = 1; i <= length; i++){
                console.log(allVideos[i]);
                if(allVideos[i]){
                        allVideos[i].remove();
                        i--;
                }
        }
        let bp = document.getElementsByClassName('btn btn-primary');
        let bd = document.getElementsByClassName('btn btn-danger');
        for(let i = 1; i < bp.length; i++){
                if(bp[i]){
                        bp[i].remove();
                        i--;
                }
        }
        for(let i = 1; i < bd.length; i++){
                if(bd[i]){
                        bd[i].remove();
                        i--;
                }
        }
        //collect the boxes that were checked and then make a new room that contians those data and streams those data
       let selected_rooms = [];
        for(let i = 0; i < data.length; i++){
                if(document.getElementById("merge_"+data[i]).checked){
                        selected_rooms.push(data[i]);
                        console.log('create extra videos & buttons');
                        let z = document.createElement('a');
                        document.getElementById('main_buttons').appendChild(z);
                        z.innerHTML = '<a id = "merged_viewer_btn ' + data[i] + '" href = "#" class = "btn btn-primary" value = "viewer"> <span class = "glyphicon glyphicon-user"></span> Viewer ' + data[i] + '</a> <br>'
                        let terminate_btn = document.createElement('a');
                        terminate_btn.innerHTML = '<a id="terminate ' + data[i] + '"  href="#" class="btn btn-danger"> <span class="glyphicon glyphicon-stop"></span> Stop ' + data[i] + '</a> <br>'
                        document.getElementById('main_buttons').appendChild(terminate_btn);
                        let x = document.createElement('video');
                        x.setAttribute('id', 'camera '+data[i]);
                        x.setAttribute('class', 'videos');
                        x.controls = true;
                        x.autoplay = true;
                        x.width = 854;
                        x.height = 480;
                        x.poster = 'img/webrtc.png';
                        let y = document.createElement('div');
                        y.setAttribute('class', 'video-container');
                        document.getElementById('videoBig').appendChild(y);
                        y.appendChild(x);
                }
        }

        toGallery();
        socketio.emit("join_MergeRoom", {
                selected_rooms: selected_rooms
        });

        console.log("SEL ROOMS " + selected_rooms);

        for(let i = 0; i < selected_rooms.length; i++){
                console.log(selected_rooms[i]);
                document.getElementById("merged_viewer_btn " + selected_rooms[i]).addEventListener('click', function() {
                        mergedViewer(data[i]);
                }); 
                document.getElementById("terminate " + selected_rooms[i]).addEventListener('click', function() {
                        stop2(i);
                })
        }
       
}

function mergedViewer(data) {
                autoView = true;
                let video2 = document.getElementById('camera ' + data);
                target = data;
                console.log(target + " target");
                        console.log(video2);
                        //if (!webRtcPeer) {
                                showSpinner(video2);
                                var options = {
                                        remoteVideo: video2,
                                        onicecandidate : onIceCandidate
                                }
                                webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function(error) {
                                        if(error) return console.error(error);
                
                                        this.generateOffer(onOfferMergedViewer);
                                });
                                webRtcPeerList.push(webRtcPeer);
                        //}   
}

function onOfferMergedViewer(error, offerSdp) {
        //console.log(cur_room);

        let access_room = target;
        if (error) return console.error(error);
    
            var message = {
                    sdpOffer : offerSdp,
                    access_room: access_room
            }
            socketio.emit('merged_viewer', message);
}



function viewer() {
        autoView = true;
        if (!webRtcPeer) {
                showSpinner(video);

                

                var options = {
                        remoteVideo: video,
                        onicecandidate : onIceCandidate
                }

                webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function(error) {
                        if(error) return console.error(error);
                        this.generateOffer(onOfferViewer);
                });
        }
}

function onOfferViewer(error, offerSdp) {

    if (error) return console.error(error);

        var message = {
                sdpOffer : offerSdp,
                // room: cur_room
        }
        socketio.emit('viewer', message);
    }

function onIceCandidate(candidate) {
	 console.log('Local candidate' + JSON.stringify(candidate));
         socketio.emit('onIceCandidate', {candidate : candidate});
}

function onIceCandidate2(candidate) {
        console.log('Local candidate' + JSON.stringify(candidate));
        socketio.emit('onIceCandidate2', {candidate : candidate});
}

function stop() {
        autoView = false;
 if (webRtcPeer) {
		 var message = {
		        id : 'stop'
		 }
		 sendMessage(message);
		 dispose();
 }
}

function stop2(i) {
        autoView = false;

 if (webRtcPeerList[i]) {
		 var message = {
		        id : 'stop'
		 }
		 sendMessage(message);
		 dispose2(i);
 }
}

function dispose2(i) {
        if (webRtcPeerList[i]) {
                webRtcPeerList[i].dispose();
                webRtcPeerList[i] = null;
        }
        let vid = document.getElementsByClassName('videos')[i];
        hideSpinner(vid);
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
		//  arguments[i].style.background = '';
 }
}

/**
* Lightbox utility (to display media pipeline image in a modal dialog)
*/
$(document).delegate('*[data-toggle="lightbox"]', 'click', function(event) {
	event.preventDefault();
	$(this).ekkoLightbox();
});

