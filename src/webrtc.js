let webrtc;

function initializeWebRTC(video, out){
  var gl = video.getContext();       //get webGl context
  var canvas = gl.canvas;               //get gl's canvas

  var video = document.querySelector('#localVideo');
  var stream = canvas.captureStream();
  video.srcObject = stream;
  video.muted = true;
  video.play();
  webrtc = new SimpleWebRTC({
    localVideoEl: stream,
    remoteVideosEl: out,
    autoRequestMedia: false,
    enableDataChannels: true,
  });

  webrtc.on('channelMessage', (peer, channel, data) => {
    if (channel === 'chat') {
      console.log(data.type, data.payload);
    }
  });

  webrtc.joinRoom('fingainpoo', function(){
    console.log("joined")
  })

  return webrtc;
}

export {initializeWebRTC};
