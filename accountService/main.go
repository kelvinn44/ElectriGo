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
	// account.InitDB()
	// defer account.DB.Close()

	// Create a new router
	r := mux.NewRouter()

	// Define the routes for the account service
	r.HandleFunc("/v1/account/register", account.RegisterUser).Methods("POST")
	r.HandleFunc("/v1/account/login", account.LoginUser).Methods("POST")
	r.HandleFunc("/v1/account/user/{user_id}", account.GetUserProfile).Methods("GET")
	r.HandleFunc("/v1/account/user/{user_id}", account.UpdateUserProfile).Methods("PUT")
	r.HandleFunc("/v1/account/requestVerificationCode", account.RequestVerificationCode).Methods("POST")

	// Enable CORS for the router with specific configuration
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://127.0.0.1:5500", "http://localhost:5500"}, // Add your front-end origin here
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE"},                   // Allow specific methods
		AllowedHeaders:   []string{"Content-Type", "Authorization"},                  // Allow necessary headers
		AllowCredentials: true,                                                       // Allow credentials like cookies, authorization headers
	})

	// Wrap the router with CORS middleware
	handler := c.Handler(r)

	// Start the server
	fmt.Println("Account Service is running on port 8080")
	log.Fatal(http.ListenAndServe(":8080", handler))
}
