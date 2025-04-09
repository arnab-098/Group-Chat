package handlers

import (
	"net/http"
)

func RenderHome(response http.ResponseWriter, request *http.Request) {
	http.ServeFile(response, request, "views/index.html")
}
