let webrtc;

function initializeWebRTC() {
 

  webrtc = new SimpleWebRTC({

    autoRequestMedia: false,
    media: {
      audio: false,
      video: false
    }
  });

  webrtc.on("channelMessage", (peer, channel, data) => {
    if (channel === "chat") {
      console.log(data.type, data.payload);
    }
  });

  webrtc.joinRoom("fh-salzburg-ar-vr", function() {
    console.log("joined");
  });

  return webrtc;
}

export { initializeWebRTC };
