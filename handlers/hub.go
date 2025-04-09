package handlers

func NewHub() *Hub {
	return &Hub{
		register:   make(chan *Client),
		unregister: make(chan *Client),
		rooms:      make(map[string]map[*Client]bool),
		broadcast:  make(chan SocketEvent, 32),
	}
}

func (hub *Hub) Run() {

	defer func() {
		close(hub.register)
		close(hub.unregister)
		close(hub.broadcast)
	}()

	go func() {
		for payload := range hub.broadcast {
			HandleBroadcast(hub, payload)
		}
	}()

	for {
		select {
		case client := <-hub.register:
			HandleRegisterClient(hub, client)

		case client := <-hub.unregister:
			HandleUnregisterClient(hub, client)
		}
	}
}
