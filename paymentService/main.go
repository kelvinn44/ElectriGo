package main

import (
	"fmt"
	"log"
	"net/http"
	"paymentService/payment"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

func main() {
	// Initialize payment DB
	payment.InitDB()

	// Create a new router
	r := mux.NewRouter()

	// Payment Routes
	r.HandleFunc("/v1/payments/make", payment.MakePayment).Methods("POST")

	// Start the server
	handler := cors.Default().Handler(r)
	fmt.Println("Payment Service is running on port 8082")
	log.Fatal(http.ListenAndServe(":8082", handler))
}
