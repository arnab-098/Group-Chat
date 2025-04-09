package handlers

import "github.com/gorilla/websocket"

type Hub struct {
	register   chan *Client
	unregister chan *Client
	rooms      map[string]map[*Client]bool
	broadcast  chan SocketEvent
}

type Client struct {
	hub        *Hub
	connection *websocket.Conn
	send       chan SocketEvent
	username   string
	roomId     string
}

type SocketEvent struct {
	roomId       string
	EventName    string `json:"EventName"`
	EventPayload any    `json:"EventPayload"`
}
