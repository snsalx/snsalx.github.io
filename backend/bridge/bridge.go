package main

import (
	"io"
	"log"
	"net/http"
	"strconv"

	"github.com/go-vgo/robotgo"
)

const help = `
<h1>Available endpoints</h1>
<h2>Mouse control</h2>
<ul>
	<li><a href="/mouse/move">mouse/move</a></li>
	<li><a href="/mouse/click">mouse/click</a></li>
</ul>
`

const mouseMoveQueryParams = `
Required query parameters: x, y, max - all numbers
max is the resolution, x/max*100 is the coordinate in %
`

func main() {
	log.Print("Listening on port 1918")

	http.HandleFunc("/mouse/move", func(w http.ResponseWriter, r *http.Request) {
		x, errX := strconv.Atoi(r.URL.Query().Get("x"))
		y, errY := strconv.Atoi(r.URL.Query().Get("y"))
		max, errMax := strconv.Atoi(r.URL.Query().Get("max"))

		if errX != nil || errY != nil || errMax != nil {
			io.WriteString(w, mouseMoveQueryParams)
			return
		}

		screenX, screenY := robotgo.GetScreenSize()
		coordinateX := screenX * x / max
		coordinateY := screenY * y / max

		robotgo.Move(coordinateX, coordinateY)
		log.Printf("Moving mouse to %dx%d px", coordinateX, coordinateY)

		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		io.WriteString(w, "OK")
	})

	http.HandleFunc("/mouse/click", func(w http.ResponseWriter, r *http.Request) {
		robotgo.Click()
		log.Print("Clicking")

		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		io.WriteString(w, "OK")
	})

	http.HandleFunc("/", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		io.WriteString(w, help)
	})

	log.Fatal(http.ListenAndServe(":1918", nil))
}
