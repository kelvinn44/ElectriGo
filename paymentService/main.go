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

	// Payment Routes
	r.HandleFunc("/v1/payments/make", payment.MakePayment).Methods("POST")
	r.HandleFunc("/v1/invoices/user/{user_id}", payment.GetInvoicesByUser).Methods("GET") // New route for fetching user invoices
	r.HandleFunc("/v1/promotions/apply", payment.ApplyPromoCode).Methods("POST")

	// Start the server
	handler := cors.Default().Handler(r)
	fmt.Println("Payment Service is running on port 8082")
	log.Fatal(http.ListenAndServe(":8082", handler))
}
