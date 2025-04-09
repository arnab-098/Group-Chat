package handlers

import "github.com/gorilla/websocket"

type Hub struct {
	register   chan *Client
	unregister chan *Client
	clients    map[*Client]bool
	broadcast  chan SocketEvent
}

type Client struct {
	hub        *Hub
	connection *websocket.Conn
	send       chan SocketEvent
	username   string
}

type SocketEvent struct {
	EventName    string `json:"EventName"`
	EventPayload any    `json:"EventPayload"`
}
