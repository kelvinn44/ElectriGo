package main

import (
	"fmt"
	"log"
	"net/http"
	"paymentService/payment"

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

	// Initialize payment DB
	payment.InitDB()

	// Create a new router
	r := mux.NewRouter()

	// Payment Service Routes
	r.HandleFunc("/v1/payments/make", payment.MakePayment).Methods("POST")                // Processes a payment for a reservation
	r.HandleFunc("/v1/invoices/user/{user_id}", payment.GetInvoicesByUser).Methods("GET") // Retrieves all invoices for a specific user by their user ID
	r.HandleFunc("/v1/promotions/apply", payment.ApplyPromoCode).Methods("POST")          // Applies a promotional code to a reservation

	// Start the server on port 8082
	handler := cors.Default().Handler(r)
	fmt.Println("Payment Service is running on port 8082")
	log.Fatal(http.ListenAndServe(":8082", handler))
}
