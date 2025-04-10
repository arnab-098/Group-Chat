const domElement = document.querySelector(".chat__app-container");
const CHUNK_SIZE = 256 * 1024;

class App extends React.Component {
    constructor() {
        super();
        this.state = {
            messages: [],
            username: "",
            roomId: "",
            connected: false,
            inputName: "",
            inputRoomId: "",
            selectedFile: null,
            chunkedFiles: {},
            messageInput: "", // NEW
        };
        this.username = "";
        this.webSocketConnection = null;
    }

    setWebSocketConnection = (roomId, username) => {
        this.username = username;
        this.setState({ username, roomId });

        if (window["WebSocket"]) {
            const socketConnection = new WebSocket(`ws://${document.location.host}/ws/${roomId}/${username}`);
            this.webSocketConnection = socketConnection;
            this.setState({ connected: true });
            this.subscribeToSocketMessage();
        }
    };

    subscribeToSocketMessage = () => {
        if (!this.webSocketConnection) return;

        this.webSocketConnection.onclose = () => {
            this.setState(prev => ({
                messages: [...prev.messages, { message: 'Your connection is closed.', type: 'announcement' }],
            }));
        };

        this.webSocketConnection.onmessage = (event) => {
            try {
                const socketPayload = JSON.parse(event.data);
                switch (socketPayload.EventName) {
                    case 'join':
                        this.addAnnouncement(`${socketPayload.EventPayload} joined the chat`);
                        break;
                    case 'disconnect':
                        this.addAnnouncement(`${socketPayload.EventPayload} left the chat`);
                        break;
                    case 'message_response':
                        const { username, message } = socketPayload.EventPayload || {};
                        if (message) {
                            this.setState(prev => ({
                                messages: [...prev.messages, {
                                    message,
                                    username: username || 'Unknown',
                                    type: 'message'
                                }]
                            }));
                        }
                        break;
                    case 'file_chunk_response':
                        this.handleIncomingChunk(socketPayload.EventPayload);
                        break;
                    default:
                        break;
                }

                setTimeout(() => {
                    const container = document.querySelector('.message-container');
                    if (container) container.scrollTop = container.scrollHeight;
                }, 100);
            } catch (error) {
                console.error("Error decoding message payload", error);
            }
        };
    };

    handleIncomingChunk = (payload) => {
        const { username, fileName, fileType, fileData, chunkIndex, totalChunks } = payload;

        this.setState(prev => {
            const chunkedFiles = { ...prev.chunkedFiles };
            if (!chunkedFiles[fileName]) {
                chunkedFiles[fileName] = { totalChunks, received: {} };
            }

            chunkedFiles[fileName].received[chunkIndex] = fileData;

            const fileChunks = chunkedFiles[fileName];
            const receivedChunks = Object.keys(fileChunks.received).length;

            if (receivedChunks === totalChunks) {
                const orderedData = Array.from({ length: totalChunks }, (_, i) => fileChunks.received[i]);

                const byteArrays = orderedData.map(base64 => {
                    const binary = atob(base64);
                    const len = binary.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        bytes[i] = binary.charCodeAt(i);
                    }
                    return bytes;
                });

                const blob = new Blob(byteArrays, { type: fileType });
                const url = URL.createObjectURL(blob);

                return {
                    chunkedFiles: { ...prev.chunkedFiles, [fileName]: undefined },
                    messages: [...prev.messages, {
                        username,
                        fileName,
                        fileType,
                        fileURL: url,
                        type: 'file',
                    }]
                };
            }

            return { chunkedFiles };
        });
    };

    addAnnouncement = (text) => {
        this.setState(prev => ({
            messages: [...prev.messages, { message: text, type: 'announcement' }]
        }));
    };

    handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            const value = this.state.messageInput.trim();
            if (!value || !this.webSocketConnection) return;

            this.webSocketConnection.send(JSON.stringify({
                EventName: 'message',
                EventPayload: value
            }));

            this.setState({ messageInput: "" }); // Clear input
        }
    };

    handleCreateRoom = () => {
        const username = this.state.inputName.trim();
        if (!username) {
            alert("Please enter your name.");
            return;
        }
        const roomId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        this.setWebSocketConnection(roomId, username);
        this.setState({ inputRoomId: "", inputName: "", messageInput: "" }); // Clear fields
    };

    handleJoinRoom = async () => {
        const username = this.state.inputName.trim();
        const roomId = this.state.inputRoomId.trim();

        if (!username || !roomId) {
            alert("Please enter your name and a Room ID.");
            return;
        }

        try {
            const res = await fetch(`/room-exists/${roomId}`);
            const data = await res.json();

            if (data.exists) {
                this.setWebSocketConnection(roomId, username);
                this.setState({ inputRoomId: "", inputName: "", messageInput: "" }); // Clear fields
            } else {
                alert("Room does not exist.");
            }
        } catch (err) {
            console.error("Failed to check room:", err);
            alert("Error checking room existence.");
        }
    };

    handleFileUpload = () => {
        const file = this.state.selectedFile;
        if (!file || !this.webSocketConnection) return;

        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        let currentChunk = 0;
        const reader = new FileReader();

        const sendChunk = () => {
            const start = currentChunk * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const blob = file.slice(start, end);

            reader.onload = () => {
                const base64 = reader.result.split(',')[1];

                this.webSocketConnection.send(JSON.stringify({
                    EventName: 'file_chunk',
                    EventPayload: {
                        fileName: file.name,
                        fileType: file.type,
                        fileData: base64,
                        totalChunks,
                        chunkIndex: currentChunk,
                    }
                }));

                currentChunk++;
                if (currentChunk < totalChunks) {
                    sendChunk();
                }
            };

            reader.readAsDataURL(blob);
        };

        sendChunk();
    };

    getChatMessages() {
        return this.state.messages.map((m, index) => {
            const isOwnMessage = m.username === this.username;
            const isImage = m.fileType && m.fileType.startsWith("image/");

            return (
                <div key={index} className={`message-payload ${isOwnMessage ? "own-message" : "other-message"}`}>
                    {m.username && <span className="username">{m.username} says:</span>}

                    {m.type === 'file' ? (
                        <div className="file-message">
                            {isImage ? (
                                <img src={m.fileURL} alt={m.fileName} className="file-preview" />
                            ) : (
                                <div className="file-info">
                                    <span className="file-icon">📎</span>
                                </div>
                            )}

                            <a
                                href={m.fileURL}
                                download={m.fileName}
                                onClick={() => setTimeout(() => URL.revokeObjectURL(m.fileURL), 1000)}
                                className="file-download-link"
                            >
                                {m.fileName}
                            </a>
                            <span className="file-type">{m.fileType}</span>
                        </div>
                    ) : (
                        <span className={`message ${m.type === "announcement" ? "announcement" : ""}`}>
                            {m.message}
                        </span>
                    )}
                </div>
            );
        });
    }

    render() {
        return (
            <>
                {!this.state.connected ? (
                    <div style={{ padding: "20px", textAlign: "center" }}>
                        <h2>Welcome to the Chat App</h2>
                        <div style={{ marginBottom: "10px" }}>
                            <input
                                type="text"
                                placeholder="Enter your name"
                                value={this.state.inputName}
                                onChange={(e) => this.setState({ inputName: e.target.value })}
                                style={{ padding: "10px", width: "60%" }}
                                autoFocus
                            />
                        </div>
                        <div style={{ marginBottom: "10px" }}>
                            <input
                                type="text"
                                placeholder="Room ID (for joining)"
                                value={this.state.inputRoomId}
                                onChange={(e) => this.setState({ inputRoomId: e.target.value })}
                                style={{ padding: "10px", width: "60%" }}
                            />
                        </div>
                        <button onClick={this.handleCreateRoom}>Create Room</button>
                        <button onClick={this.handleJoinRoom} style={{ marginLeft: "10px" }}>Join Room</button>
                    </div>
                ) : (
                    <div className="chat-screen">
                        <h3 style={{ textAlign: "center" }}>Room ID: {this.state.roomId}</h3>

                        <div className="message-container">
                            {this.getChatMessages()}
                        </div>

                        <div className="input-bar">
                            <input
                                type="text"
                                placeholder="Type your message"
                                value={this.state.messageInput}
                                onChange={(e) => this.setState({ messageInput: e.target.value })}
                                onKeyPress={this.handleKeyPress}
                            />
                            <input
                                type="file"
                                onChange={(e) => this.setState({ selectedFile: e.target.files[0] })}
                            />
                            <button onClick={this.handleFileUpload}>Send File</button>
                        </div>
                    </div>
                )}
            </>
        );
    }
}

ReactDOM.render(<App />, domElement);
