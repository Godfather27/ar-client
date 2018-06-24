let webrtc;

function initializeWebRTC(video, out){
  var gl = video.getContext();       //get webGl context
  var canvas = gl.canvas;               //get gl's canvas

  console.log("HALLO")
  var video = document.querySelector('#localVideo');
  var stream = canvas.captureStream();
  video.srcObject = stream;
  video.muted = true;
  video.play();
  webrtc = new SimpleWebRTC({
    localVideoEl: video,
    remoteVideosEl: out,
    autoRequestMedia: true,
    enableDataChannels: true,
  });

  webrtc.on('channelMessage', (peer, channel, data) => {
    if (channel === 'chat') {
      console.log(data.type, data.payload);
    }
  });

  webrtc.on('readyToCall', () => {
    console.log("READY")
    webrtc.joinRoom('lexi', () => {
      console.log("JOIN")
      webrtc.sendDirectlyToAll('chat', 'message', "ar joined the party");
    });
  });

  return webrtc;
}

export {initializeWebRTC};
