let webrtc;

function initializeWebRTC() {


  webrtc = new SimpleWebRTC({

    autoRequestMedia: false,
    media: {
      audio: false,
      video: false
    }
  });

  // webrtc.on("channelMessage", (peer, channel, data) => {
  //   if (channel === "chat") {
  //     console.log(data.type, data.payload);
  //   }
  // });

  webrtc.joinRoom(new URL(window.location.href).searchParams.get('roomName') || 'fh-salzburg-ar-vr', function() {

  });

  return webrtc;
}

function sendToVR(data) {
  webrtc.sendDirectlyToAll("chat", "message", data);
}

export { initializeWebRTC, sendToVR };
