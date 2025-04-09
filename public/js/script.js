const domElement = document.querySelector(".chat__app-container");

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
        };
        this.username = "";
        this.webSocketConnection = null;
    }

    setWebSocketConnection = (roomId, username) => {
        this.username = username;
        this.setState({
            username: username,
            roomId: roomId
        });

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
                        if (socketPayload.EventPayload) {
                            const { username, message } = socketPayload.EventPayload;
                            this.setState(prev => ({
                                messages: [...prev.messages, {
                                    message,
                                    username: username || 'An unnamed fellow',
                                    type: 'message'
                                }]
                            }));
                        }
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

    addAnnouncement = (text) => {
        this.setState(prev => ({
            messages: [...prev.messages, { message: text, type: 'announcement' }]
        }));
    };

    handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            const value = event.target.value.trim();
            if (!value || !this.webSocketConnection) return;

            this.webSocketConnection.send(JSON.stringify({
                EventName: 'message',
                EventPayload: value
            }));

            event.target.value = '';
        }
    };

    handleCreateRoom = () => {
        const username = this.state.inputName.trim();
        if (!username) {
            alert("Please enter your name.");
            return;
        }
        const roomId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        console.log(roomId);
        this.setWebSocketConnection(roomId, username);
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
            } else {
                alert("Room does not exist.");
            }
        } catch (err) {
            console.error("Failed to check room:", err);
            alert("Error checking room existence.");
        }
    };

    getChatMessages() {
        return (
            <div className="message-container">
                {
                    this.state.messages.map((m, index) => {
                        const isOwnMessage = m.username === this.username;
                        return (
                            <div
                                key={index}
                                className={`message-payload ${isOwnMessage ? "own-message" : "other-message"}`}
                            >
                                {m.username && <span className="username">{m.username} says:</span>}
                                <span className={`message ${m.type === "announcement" ? "announcement" : ""}`}>
                                    {m.message}
                                </span>
                            </div>
                        );
                    })
                }
            </div>
        );
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
                    <>
                        <h3 style={{ textAlign: "center" }}>Room ID: {this.state.roomId}</h3>
                        {this.getChatMessages()}
                        <input
                            type="text"
                            id="message-text"
                            size="64"
                            autoFocus
                            placeholder="Type your message"
                            onKeyPress={this.handleKeyPress}
                        />
                    </>
                )}
            </>
        );
    }
}

ReactDOM.render(<App />, domElement);
