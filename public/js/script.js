const domElement = document.querySelector(".chat__app-container");

class App extends React.Component {
    constructor() {
        super();
        this.state = {
            messages: [],
            username: "",
        }
        this.username = "";
        this.webSocketConnection = null;
    }

    componentDidMount() {
        this.setWebSocketConnection();
        this.subscribeToSocketMessage();
    }

    setWebSocketConnection() {
        const username = prompt("What's Your name");
        this.setState({ username })
        this.username = username
        if (window["WebSocket"]) {
            const socketConnection = new WebSocket("ws://" + document.location.host + "/ws/" + username);
            this.webSocketConnection = socketConnection;
        }
    }

    subscribeToSocketMessage = () => {
        if (this.webSocketConnection === null) {
            return;
        }

        this.webSocketConnection.onclose = () => {
            const messages = this.state.messages;
            messages.push({
                message: 'Your Connection is closed.',
                type: 'announcement'
            })
            this.setState({
                messages
            });
        };

        this.webSocketConnection.onmessage = (event) => {
            try {
                const socketPayload = JSON.parse(event.data);
                switch (socketPayload.EventName) {
                    case 'join':
                        if (!socketPayload.EventPayload) {
                            return
                        }

                        this.setState({
                            messages: [
                                ...this.state.messages,
                                ...[{
                                    message: `${socketPayload.EventPayload} joined the chat`,
                                    type: 'announcement'
                                }]
                            ]
                        });

                        break;
                    case 'disconnect':
                        if (!socketPayload.EventPayload) {
                            return
                        }
                        this.setState({
                            messages: [
                                ...this.state.messages,
                                ...[{
                                    message: `${socketPayload.EventPayload} left the chat`,
                                    type: 'announcement'
                                }]
                            ]
                        });
                        break;

                    case 'message_response':

                        if (!socketPayload.EventPayload) {
                            return
                        }

                        const messageContent = socketPayload.EventPayload;
                        const sentBy = messageContent.username ? messageContent.username : 'An unnamed fellow'
                        const actualMessage = messageContent.message;

                        this.setState({
                            messages: [
                                ...this.state.messages,
                                {
                                    message: actualMessage,
                                    username: `${sentBy}`,
                                    type: 'message'
                                }
                            ]
                        });

                        break;

                    default:
                        break;
                }
                setTimeout(() => {
                    const container = document.querySelector('.message-container');
                    container.scrollTop = container.scrollHeight;
                }, 100);
            } catch (error) {
                console.log(error)
                console.warn('Something went wrong while decoding the Message Payload')
            }
        };
    }

    handleKeyPress = (event) => {
        try {
            if (event.key === 'Enter') {
                if (!this.webSocketConnection) {
                    return false;
                }
                if (!event.target.value) {
                    return false;
                }

                this.webSocketConnection.send(JSON.stringify({
                    EventName: 'message',
                    EventPayload: event.target.value
                }));

                event.target.value = '';
                event.target.focus();
            }
        } catch (error) {
            console.log(error)
            console.warn('Something went wrong while decoding the Message Payload')
        }
    }

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
                                {m.username && (
                                    <span className="username">{m.username} says:</span>
                                )}
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
                {this.getChatMessages()}
                <input type="text" id="message-text" size="64" autoFocus placeholder="Type Your message" onKeyPress={this.handleKeyPress} />
            </>
        );
    }
}

ReactDOM.render(<App />, domElement)
