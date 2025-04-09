package handlers

import (
	"bytes"
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (9 * pongWait) / 10
	maxMessageSize = 1024
)

func CreateNewClient(hub *Hub, connection *websocket.Conn, username string, roomId string) {
	client := &Client{
		hub:        hub,
		connection: connection,
		send:       make(chan SocketEvent),
		username:   username,
		roomId:     roomId,
	}

	client.hub.register <- client

	go client.readPump()
	go client.writePump()
}

func HandleRegisterClient(hub *Hub, client *Client) {
	if hub.rooms[client.roomId] == nil {
		hub.rooms[client.roomId] = make(map[*Client]bool)
	}
	hub.rooms[client.roomId][client] = true

	handleSocketPayloadEvents(client, SocketEvent{
		EventName:    "join",
		EventPayload: client.username,
	})
}

func HandleUnregisterClient(hub *Hub, client *Client) {
	_, ok := hub.rooms[client.roomId][client]
	if ok {
		delete(hub.rooms[client.roomId], client)
		if len(hub.rooms[client.roomId]) == 0 {
			delete(hub.rooms, client.roomId)
		}
		close(client.send)

		handleSocketPayloadEvents(client, SocketEvent{
			EventName:    "disconnect",
			EventPayload: client.username,
		})
	}
}

func HandleBroadcast(hub *Hub, payload SocketEvent) {
	for client := range hub.rooms[payload.roomId] {
		select {
		case client.send <- payload:
		default:
			close(client.send)
			delete(hub.rooms[client.roomId], client)
			if len(hub.rooms[client.roomId]) == 0 {
				delete(hub.rooms, client.roomId)
			}
		}
	}
}

func handleSocketPayloadEvents(client *Client, payload SocketEvent) {
	var response SocketEvent
	switch payload.EventName {
	case "join":
		log.Println("Join event triggered")
		client.hub.broadcast <- SocketEvent{
			roomId:       client.roomId,
			EventName:    "join",
			EventPayload: payload.EventPayload,
		}
	case "disconnect":
		log.Println("Disconnect event triggered")
		client.hub.broadcast <- SocketEvent{
			roomId:       client.roomId,
			EventName:    "disconnect",
			EventPayload: payload.EventPayload,
		}
	case "message":
		log.Println("Message event triggered")
		response.roomId = client.roomId
		response.EventName = "message_response"
		response.EventPayload = map[string]any{
			"username": client.username,
			"message":  payload.EventPayload,
		}
		client.hub.broadcast <- response
	}
}

func (client *Client) readPump() {
	var socketEventPayload SocketEvent

	defer unregisterAndCloseConnection(client)

	setSocketReadConfig(client)

	for {
		_, payload, err := client.connection.ReadMessage()

		decoder := json.NewDecoder(bytes.NewReader(payload))
		decoderErr := decoder.Decode(&socketEventPayload)

		if decoderErr != nil {
			log.Printf("error: %v", decoderErr)
			break
		}

		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
				break
			}
		}

		handleSocketPayloadEvents(client, socketEventPayload)
	}
}

func (client *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)

	defer func() {
		ticker.Stop()
		client.connection.Close()
	}()

	for {
		select {
		case payload, ok := <-client.send:
			reqBodyBytes := new(bytes.Buffer)
			json.NewEncoder(reqBodyBytes).Encode(payload)
			finalPayload := reqBodyBytes.Bytes()

			client.connection.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				client.connection.WriteMessage(websocket.CloseMessage, []byte{})
				break
			}

			w, err := client.connection.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}

			w.Write(finalPayload)

			n := len(client.send)
			for range n {
				reqBodyBytes.Reset()
				json.NewEncoder(reqBodyBytes).Encode(<-client.send)
				w.Write(reqBodyBytes.Bytes())
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			client.connection.SetWriteDeadline(time.Now().Add(writeWait))
			if err := client.connection.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func unregisterAndCloseConnection(client *Client) {
	client.hub.unregister <- client
	client.connection.Close()
}

func setSocketReadConfig(client *Client) {
	client.connection.SetReadLimit(maxMessageSize)
	client.connection.SetReadDeadline(time.Now().Add(pongWait))
	client.connection.SetPongHandler(func(string) error {
		client.connection.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
}
