package main

import (
	"carRentalService/booking"
	"carRentalService/car"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

func main() {
	// Initialize the database connections for booking and car services
	car.InitDB()
	booking.InitDB()

	// Create a new router
	r := mux.NewRouter()

	// Define the routes for the car service
	r.HandleFunc("/v1/vehicles", car.GetAllVehicles).Methods("GET")

	// Define the routes for the booking service
	r.HandleFunc("/v1/vehicles/reserve", booking.MakeReservation).Methods("POST")
	r.HandleFunc("/v1/reservations/{reservation_id}/cancel", booking.CancelReservation).Methods("PUT")

	// Enable CORS for the router with specific configuration
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://127.0.0.1:5500", "http://localhost:5500"}, // Add your front-end origin here
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE"},                   // Allow specific methods
		AllowedHeaders:   []string{"Content-Type", "Authorization"},                  // Allow necessary headers
		AllowCredentials: true,                                                       // Allow credentials like cookies, authorization headers
	})

	// Wrap the router with CORS middleware
	handler := c.Handler(r)

	// Start the server on port 8081
	fmt.Println("Car Rental Service is running on port 8081")
	log.Fatal(http.ListenAndServe(":8081", handler))
}
