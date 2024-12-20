const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
let localStream = null;
let remoteStream = null;
let peerConnection = null;

const servers = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302',
        },
    ],
};

// Create a Promise to track when localStream is ready
let localStreamReady = new Promise((resolve, reject) => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            localStream = stream;
            localVideo.srcObject = stream;
            console.log('Local stream obtained successfully');
            resolve(); // Resolve the Promise
        })
        .catch(error => {
            console.error('Error accessing media devices.', error);
            alert('Could not access your camera and microphone. Please check your permissions.');
            reject(error);
        });
});

// Handle incoming WebRTC signaling
socket.on('offer', async (data) => {
    await localStreamReady; // Wait for localStream to be ready
    peerConnection = createPeerConnection();
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', { target: data.sender, answer });
});

socket.on('answer', async (data) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
});

socket.on('candidate', async (data) => {
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (err) {
        console.error('Error adding received ICE candidate', err);
    }
});

// Create and configure the peer connection
function createPeerConnection() {

    console.log('Creating peer connection');
    const connection = new RTCPeerConnection(servers);

    connection.onicecandidate = (event) => {
        console.log('Got ice candidate');
        if (event.candidate) {
            socket.emit('candidate', { target: 'REMOTE_SOCKET_ID', candidate: event.candidate });
        }
    };

    console.log('Setting up event handlers for the connection');

    connection.ontrack = (event) => {
        console.log('Got remote stream');
        if (!remoteStream) {
            remoteStream = new MediaStream();
            remoteVideo.srcObject = remoteStream;
        }
        // Add the remote track to the stream
        remoteStream.addTrack(event.track);
    
        // Log to confirm remote video is being set
        console.log('Remote video srcObject set to: ', remoteVideo.srcObject);
    };
    
    return connection;
}

// Send an offer after the user connects and localStream is ready
socket.on('connect', async () => {
    await localStreamReady; // Wait for localStream initialization
    peerConnection = createPeerConnection();
    localStream.getTracks().forEach(track => {
        console.log('Adding local stream to peer connection', track);
        peerConnection.addTrack(track, localStream)
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit('offer', { target: 'REMOTE_SOCKET_ID', offer });
});
