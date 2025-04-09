package main

import (
	"log"
	"net/http"

	handlers "group-chat/handlers"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

func setStaticFolder(route *mux.Router) {
	fs := http.FileServer(http.Dir("./public/"))
	route.PathPrefix("/public/").Handler(http.StripPrefix("/public/", fs))
}

func AddAppRoutes(route *mux.Router) {
	log.Println("Loading Routes...")

	setStaticFolder(route)

	hub := handlers.NewHub()
	go hub.Run()

	route.HandleFunc("/", handlers.RenderHome).Methods("GET")

	route.HandleFunc("/room-exists/{room}", handlers.CheckRoomExists(hub)).Methods("GET")

	route.HandleFunc("/ws/{room}/{username}", func(w http.ResponseWriter, r *http.Request) {
		var upgrader = websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		}

		vars := mux.Vars(r)
		username := vars["username"]
		room := vars["room"]

		connection, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println(err)
			return
		}

		handlers.CreateNewClient(hub, connection, username, room)
	})

	log.Println("Routes are now loaded")
}
