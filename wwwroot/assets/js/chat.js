const UID = "GetID"
let ConnectionState = document.getElementById('connection-status')

const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
}

let localStream = new MediaStream()
let audiotrack
let audio
let peerConnection
let numberofcandidate = 0
let iceConnectionStateChangeTimer

async function srconnect() {
    
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            localStream = stream
            audiotrack = localStream.getAudioTracks().find(track => track.kind === 'audio')
            audiotrack.enabled = false
            audio = new Audio()
            audio.volume = 0.5
            audio.srcObject = localStream
            updateAudioVisualization(localStream);
        })
        .catch(error => { 
            localStream = null;
            err = error;
            document.getElementById('voice-icon').classList.add('text-danger')
            Swal.fire({
                icon: 'error',
                title: 'ไม่สามารถเชื่อมต่อกับไมโครโฟนได้',
                text: 'กรุณาตรวจสอบการเชื่อมต่อไมโครโฟนของท่าน และลองเข้าใช้งานใหม่อีกครั้ง ' + error,
                footer: '<a href="https://www.google.com/search?q=chrome+allow+microphone+access&oq=chrome+allow+microphone+access&aqs=chrome..69i57j0l7.10560j0j7&sourceid=chrome&ie=UTF-8" target="_blank">คลิกที่นี่เพื่อดูวิธีการเปิดใช้ไมโครโฟน</a>'
            })
        })
}

srconnect();

function updateAudioVisualization(stream) {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
  
    // Connect the source to the analyser
    source.connect(analyser);
  
    // Start the animation loop
    requestAnimationFrame(update);
    function update() {
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);
  
      // Calculate the average volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
  
      // Update the color of the icon based on the volume
      const icon = document.getElementById('voice-icon');
      //document.getElementById('analyzer').innerHTML = average.toFixed(0);
      if (icon.classList.contains('ri-mic-fill')) {
        if (average > 10) {
          icon.classList.add('text-success');
        } else {
          icon.classList.remove('text-success');
        }
      }
      // Call the update function again on the next animation frame
      requestAnimationFrame(update);
    }
  }


function handleDeviceChange(event) {
    console.log('Media device changed:', event);
    // Check if the audio device is still available
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        localStream = stream;
        audiotrack = localStream.getAudioTracks().find(track => track.kind === 'audio')
        audio = new Audio()
        audio.volume = 0.5
        audio.srcObject = localStream
        document.getElementById('voice-icon').classList.remove('text-danger')
        if ($('#buttonMic').hasClass('active')) { audiotrack.enabled = true } else { audiotrack.enabled = false }
        if ($('#playback-btn').hasClass('active')) { audio.play() } else { audio.pause() }
        updateAudioVisualization(localStream);
      })
      .catch(error => {
        if (peerConnection) close_all();
        err = error;
        localStream = null;
        document.getElementById('voice-icon').classList.add('text-danger')
        Swal.fire({
            icon: 'error',
            title: 'ไม่สามารถเชื่อมต่อกับไมโครโฟนได้',
            text: 'กรุณาตรวจสอบการเชื่อมต่อไมโครโฟนของท่าน และลองเข้าใช้งานใหม่อีกครั้ง ' + error,
            footer: '<a href="https://www.google.com/search?q=chrome+allow+microphone+access&oq=chrome+allow+microphone+access&aqs=chrome..69i57j0l7.10560j0j7&sourceid=chrome&ie=UTF-8" target="_blank">คลิกที่นี่เพื่อดูวิธีการเปิดใช้ไมโครโฟน</a>'
        })
      });
    }

navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

const SignalRConnection = new signalR.HubConnectionBuilder()
    .withUrl('/myhub')
    .build();

SignalRConnection.on(`Signaling/${UID}`, async function (message) {
    const messageobj = JSON.parse(message)
    if (messageobj.key) {
        if (messageobj.key === 'leave') {
            handleNodeLeave(messageobj.key)
        }
        if (messageobj.key === 'connected') {
            handleNodeConnected(messageobj.key)
        }
    } else {
        if (messageobj.type === 'offer') {
            console.log('Got offer')
            handleOffer(messageobj)
        }
        if (messageobj.type === 'candidate') {
            peerConnection.addIceCandidate(messageobj.message)
        }
        if (messageobj.type === 'leave') {
            handleLeave(messageobj)
        }
        if  (messageobj.type === 'answer') {
            console.log('Got answer')
            handleAnswer(messageobj)
        }
    }
});

SignalRConnection.start().then(function () {
    console.log('connected')
    ConnectionState.innerHTML = 'กำลังเชื่อมต่อ'
    ConnectionState.classList.remove('text-danger')
    ConnectionState.classList.add('text-primary')

    setTimeout(async function () {
        peerConnection = new RTCPeerConnection(servers)

        if (localStream) {
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream)
            })
        }   
        IceConnectionStateChangeTimer()

        let offer = await peerConnection.createOffer()
        await peerConnection.setLocalDescription(offer)

        //เมื่อมี ice candidate ใหม่จะทำการส่ง ice candidate ไปยัง user อื่น
        peerConnection.onicecandidate = async (event) => {
            if (event.candidate) {
                numberofcandidate++;
                if (numberofcandidate == 3) {
                    peerConnection.createOffer().then(function (offer) {
                        peerConnection.setLocalDescription(offer);
                        SignalRConnection.invoke('Signaling', JSON.stringify({ 'type': 'offer', 'message': offer, 'user': UID }))
                    })
                }
                SignalRConnection.invoke('Signaling', JSON.stringify({ 'type': 'candidate', 'message': event.candidate, 'user': UID }))
            }
        }

        peerConnection.oniceconnectionstatechange = function (event) {
            if (peerConnection.iceConnectionState === 'disconnected') {
                handleLeave()
            }
            if (peerConnection.iceConnectionState === 'connected') {
                ConnectionState.innerHTML = 'เชื่อมต่อแล้ว'
                ConnectionState.classList.remove('text-primary')
                ConnectionState.classList.add('text-success')
            }
        }
    }, 3000)

}).catch(function (err) {
    return console.error(err.toString());
});

function IceConnectionStateChangeTimer() {
    iceConnectionStateChangeTimer = {
        hasEventOccurred: false,
        timer: setTimeout(() => {
            if (!iceConnectionStateChangeTimer.hasEventOccurred && peerConnection.iceConnectionState !== 'connected') {
                handleLeave()
                ConnectionState.innerHTML = 'ไม่สามารถเชื่อมต่อได้'
                ConnectionState.classList.remove('text-primary')
                ConnectionState.classList.add('text-danger')
            }
        }, 20000)
    };
}

async function handleOffer (messageobj){
    SignalRConnection.invoke('SendMessage',UID, JSON.stringify(messageobj.message))
    await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(messageobj.message)))
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(new RTCSessionDescription(answer))
    SignalRConnection.invoke('Signaling', JSON.stringify({ 'type': 'answer', 'message': peerConnection.localDescription, 'user': UID }))
}

async function handleLeave (messageobj){
    document.getElementById('connection-status').innerHTML = 'Disconnected'
    peerConnection.close()
}

async function handleNodeLeave (key) {
    document.getElementById(`user-container-${key}`).remove()
    Swal.fire({
        icon: 'error',
        title: `${Model.find(obj => obj.key === key).name} Disconnected`,
        showConfirmButton: false,
        timer: 1500
    })
}

async function handleNodeConnected (key) {
    var status_text = document.getElementById(`status-${key}`)
    status_text.classList.remove('text-danger')
    status_text.classList.remove('text-muted')
    status_text.classList.add('text-primary')
    status_text.innerHTML = "ถ่ายทอด"
}

async function handleAnswer (messageobj) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(messageobj.message)))
}

async function sendRequest (key) {
    SignalRConnection.invoke('Signaling', JSON.stringify({ 'type': 'request', 'message': null, 'user': UID, 'key': key }))
}

async function createNodeConnection(key) {
    let player = document.getElementById(`user-container-${key}`)
    if (player === null) {
        player = `
                    <div class="col" id="user-container-${key}">
                        <div class="card team-box">
                            <div class="card-body p-2">
                                <div class="row team-row">
                                    <div class="col team-settings">
                                        <div class="card-header align-items-center d-flex" style="height: 30px;">
                                            <div class="card-title mb-0 flex-grow-1">
                                                <h4 class="mb-1 projects-num text-mute" id="status-${key}">${IsOnline.find(obj => obj.id === key) ? "กำลังเชื่อมต่อ" : "ออฟไลน์"}</h4>                                                                                                                 
                                            </div>
                                            <div class="ms-3 flex-shrink-0">
                                                <button type="button" value="${key}" class="btn-close ms-auto" id="customizerclose-btn" data-bs-dismiss="offcanvas" aria-label="Close" onclick="openmodal(this)" data-bs-toggle="modal" data-bs-target="#broardcastModal" modal-type="close"></button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col ms-3">
                                        <div class="row align-items-center">
                                            <div class="col my-2">                                                                                                           
                                                <div class="team-content"> 
                                                    <a class="member-name" data-bs-toggle="offcanvas" href="#member-overview" aria-controls="member-overview">
                                                        <h5 class="fs-16 mb-1" id="nodename-${key}">${Model.find(obj => obj.key === key).name}</h5>
                                                    </a>
                                                    <p class="text-muted member-designation mb-0">${Model.find(obj => obj.key === key).description}</p>
                                                </div>                                                    
                                            </div>                                           
                                            <div class="col">
                                                <div class="row align-items-center">
                                                    <div class="col-sm-2">
                                                        <div class="d-flex justify-content-center">
                                                            <button type="button" id="mute-btn-${key}" class="btn btn-md custom-toggle" data-bs-toggle="button" id="mute-button" aria-pressed="false">
                                                                    <span class="icon-on"><i class="ri-volume-up-line ri-xl text-success" style="display: flex; align-items: center;"></i></span>
                                                                    <span class="icon-off"><i class="ri-volume-mute-line ri-xl text-danger" style="display: flex; align-items: center;"></i></span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div class="col-6">
                                                        <input type="range" class="volume" style="width:100%; display: flex; align-items: center;" id="volume-${key}" name="volume-${key}" min="0" max="1000" value="500">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
        
    `
    document.getElementById('team-member-list').insertAdjacentHTML('beforeend', player)
    document.getElementById(`volume-${key}`).addEventListener('change', function () {
        let volume = document.getElementById(`volume-${key}`).value
        sendMessagetoCore('stream', volume, key, 'ch-vol')
        document.getElementById(`mute-btn-${key}`).classList.remove('active')
    })
    document.getElementById(`mute-btn-${key}`).addEventListener('click', function () {
        if (document.getElementById(`mute-btn-${key}`).classList.contains('active')) {
            sendMessagetoCore('stream', 0, key, 'ch-vol')
        }
        else {
            let volume = document.getElementById(`volume-${key}`).value
            sendMessagetoCore('stream', volume, key, 'ch-vol')
        }
    })
    document.getElementById(`user-container-${key}`).addEventListener('click', function () {
        let volume = document.getElementById(`volume-${key}`).value
        sendMessagetoCore('stream', volume, key, 'ch-vol')
        document.getElementById(`mute-btn-${key}`).classList.remove('active')
    }
    )
    }
}

async function toggleMic() {
    let audiotrack = localStream.getAudioTracks().find(track => track.kind === 'audio')
    let buttonMic = document.getElementById('buttonMic')
    let icon = document.getElementById('voice-icon')
    if (audiotrack.enabled) {
        audiotrack.enabled = false
        icon.classList.remove('text-success')
        icon.classList.remove('ri-mic-fill')
        icon.classList.add('ri-mic-off-fill')
        buttonMic.classList.remove('btn-success')
    } else {
        audiotrack.enabled = true
        icon.classList.remove('ri-mic-off-fill')
        icon.classList.add('ri-mic-fill')
        buttonMic.classList.add('btn-success')
    }
}

document.getElementById('buttonMic').addEventListener('click', toggleMic)

document.getElementById('playback-btn').addEventListener('click', function () {
    if (audio.paused) {
        audio.play()
    }
    else {
        audio.pause()
    }
})