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

	// Car Rental Service Routes
	r.HandleFunc("/v1/vehicles", car.GetAllVehicles).Methods("GET") // Retrieves a list of all available vehicles

	// Booking Service Routes
	r.HandleFunc("/v1/bookings/reserve", booking.MakeReservation).Methods("POST")                      // Creates a new reservation for a vehicle
	r.HandleFunc("/v1/bookings/{reservation_id}", booking.GetReservation).Methods("GET")               // Retrieves details of a specific reservation by its ID
	r.HandleFunc("/v1/reservations/{reservation_id}/cancel", booking.CancelReservation).Methods("PUT") // Cancels a specific reservation by its ID
	r.HandleFunc("/v1/bookings/user/{user_id}", booking.GetUserReservations).Methods("GET")            // Retrieves all reservations for a specific user by their user ID
	r.HandleFunc("/v1/bookings/{reservation_id}", booking.UpdateReservation).Methods("PUT")            // Updates the details of a specific reservation by its ID

	// Start the server on port 8081
	handler := cors.Default().Handler(r)
	fmt.Println("Car Rental Service is running on port 8081")
	log.Fatal(http.ListenAndServe(":8081", handler))
}
