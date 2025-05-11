# Group Chat Application

A real-time group chat application built with Go and JavaScript, featuring a web-based interface for seamless communication. Users can create or join chat rooms using a password.

## Features

* **Real-Time Communication**: Instant messaging among multiple users using WebSockets.
* **Web Interface**: Clean, browser-accessible UI.
* **Concurrent User Support**: Efficient handling of multiple users via Go’s goroutines.
* **Custom Port Support**: Run the server on any port using the `addr` flag.
* **Room Creation**: Users can create a chat room.
* **Room Joining**: Users can join a room by providing the room password.

## Technologies Used

* **Backend**: Go (Golang)
* **Frontend**: HTML, CSS, JavaScript
* **Communication**: WebSockets

## Project Structure

* `server.go`: Main application entry point.
* `routes.go`: Defines web routes and handlers.
* `handlers/`: WebSocket and chat logic.
* `views/`: HTML templates rendered on the frontend.
* `public/`: Static frontend files (JS, CSS).
* `go.mod`, `go.sum`: Dependency management.

## Getting Started

### Prerequisites

* Go (1.16 or later)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/arnab-098/Group-Chat.git
   cd Group-Chat
   ```

2. Run the application on default port (8080):

   ```bash
   go run server.go
   ```

3. Or run on a custom port using the `-addr` flag:

   ```bash
   go run server.go -addr="9090"
   ```

4. Open your browser and go to `http://localhost:8080` (or the custom port you specified).

## How It Works

* **Room Creation**:

  * Users can create a new room by entering a room name and password.
  * The server verifies the room details and creates the room if valid.

* **Room Joining**:

  * Users can join an existing room by providing the room name and the correct room password.
  * If the password matches, they are granted access to the room.

* **Communication**:

  * Once inside the room, users can send messages to everyone in that room.
  * All users in the same room will receive the message in real-time.

## Contributing

Contributions are welcome! Feel free to fork the repo and submit a pull request for improvements or features.

## License

*No license currently specified — consider adding one to clarify use rights.*

---

For more projects, visit [arnab-098's GitHub profile](https://github.com/arnab-098/).
