Copyright © 2013-2016 [Kurento]. Licensed under [Apache 2.0 License].

kurento-one2many-call
=====================

Kurento Java Tutorial: WebRTC one to many video call.

Manipulated the kurento media server and used WebRTC API to generate an N to N monitoring system.

The viewer side (person who monitors videos) and sender side (camera which shows to the viewer side) are differentiated through url.

<img width="1423" alt="kurento_project" src="https://user-images.githubusercontent.com/70008295/214702898-571d2a3b-5df7-4546-9a4e-e953f107cacf.png">

The viewer can access various rooms created by the sender side (used sockets to accomplish this).
If the viewer wants to see various cameras simultaneously, then the viewer can merge the different rooms.
Different layouts of the cameras are supported.
Cameras that are shown are recorded and automatically saved when the connection is lost.
