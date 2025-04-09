package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"

	handlers "group-chat/handlers"

	"github.com/gorilla/mux"
)

var addr = flag.String("addr", "4444", "port address")

func main() {
	flag.Parse()
	ip, err := handlers.GetLocalIP()
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Server will start listening at http://%v:%v\n", ip, *addr)
	route := mux.NewRouter()
	AddAppRoutes(route)
	log.Fatal(http.ListenAndServe("0.0.0.0:"+*addr, route))
}
