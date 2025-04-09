package handlers

func NewHub() *Hub {
	return &Hub{
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
		broadcast:  make(chan SocketEvent, 32),
	}
}

func (hub *Hub) Run() {

	defer func() {
		if r := recover(); r != nil {
		}
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
