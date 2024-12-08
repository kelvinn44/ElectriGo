package main

import (
	"accountService/account"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

func main() {
	// Load environment variables
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	// Initialize the database connection
	account.InitDB()

	// Create a new router
	r := mux.NewRouter()

	// Account Service Routes
	r.HandleFunc("/v1/account/register", account.RegisterUser).Methods("POST")                           // Registers a new user account
	r.HandleFunc("/v1/account/login", account.LoginUser).Methods("POST")                                 // Logs in a user
	r.HandleFunc("/v1/account/user/{user_id}", account.GetUserProfile).Methods("GET")                    // Retrieves the profile of a specific user by their user ID
	r.HandleFunc("/v1/account/user/{user_id}", account.UpdateUserProfile).Methods("PUT")                 // Updates the profile information for a specific user
	r.HandleFunc("/v1/account/requestVerificationCode", account.RequestVerificationCode).Methods("POST") // Sends a verification code to the user's email for account sign up verification
	r.HandleFunc("/v1/bookings/user/{user_id}/total", account.GetTotalReservations).Methods("GET")       // Retrieves the total number of reservations made by a user

	// Start the server on port 8080
	handler := cors.Default().Handler(r)
	fmt.Println("Account Service is running on port 8080")
	log.Fatal(http.ListenAndServe(":8080", handler))
}
