package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
)

func RenderHome(response http.ResponseWriter, request *http.Request) {
	http.ServeFile(response, request, "views/index.html")
}

func CheckRoomExists(hub *Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		roomId := mux.Vars(r)["room"]
		_, exists := hub.rooms[roomId]
		w.Header().Set("Content-type", "application.json")
		json.NewEncoder(w).Encode(map[string]bool{"exists": exists})
	}
}
