package booking

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/gorilla/mux"
)

// DB variable for global database connection for booking service
var db *sql.DB

// Initialize the database connection for booking service
func InitDB() {
	var err error
	// Connect to the MySQL database
	dsn := "user:password@tcp(localhost:3306)/ElectriGo_VehicleDB?parseTime=true"
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal(err)
	}
	if err := db.Ping(); err != nil {
		log.Fatal(err)
	}
	fmt.Println("Booking Database connected successfully.")
}

// Reservation struct represents a reservation in the system
type Reservation struct {
	ReservationID int       `json:"reservation_id"`
	UserID        int       `json:"user_id"`
	VehicleID     int       `json:"vehicle_id"`
	VehicleName   string    `json:"vehicle_name"`
	HourlyRate    float64   `json:"hourly_rate"`
	StartTime     time.Time `json:"start_time"`
	EndTime       time.Time `json:"end_time"`
	Status        string    `json:"status"`
	TotalCost     float64   `json:"total_cost"`
	CreatedAt     time.Time `json:"created_at"`
}

// Make a new reservation
func MakeReservation(w http.ResponseWriter, r *http.Request) {
	var reservation Reservation

	// Decode the JSON request body into the reservation struct
	err := json.NewDecoder(r.Body).Decode(&reservation)
	if err != nil {
		log.Println("Error decoding reservation input:", err)
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	log.Printf("Decoded Reservation Input: %+v\n", reservation)

	// Parse Start and End Time from ISO 8601 format
	layout := time.RFC3339
	startTime, err := time.Parse(layout, reservation.StartTime.Format(layout))
	if err != nil {
		log.Println("Error parsing StartTime:", err)
		http.Error(w, "Invalid start time format", http.StatusBadRequest)
		return
	}
	reservation.StartTime = startTime

	endTime, err := time.Parse(layout, reservation.EndTime.Format(layout))
	if err != nil {
		log.Println("Error parsing EndTime:", err)
		http.Error(w, "Invalid end time format", http.StatusBadRequest)
		return
	}
	reservation.EndTime = endTime

	// Validate input data
	if reservation.UserID == 0 || reservation.VehicleID == 0 || reservation.StartTime.IsZero() || reservation.EndTime.IsZero() {
		log.Println("Missing or invalid input fields for reservation")
		http.Error(w, "Missing or invalid input fields", http.StatusBadRequest)
		return
	}

	// Check if the vehicle is available
	var availabilityStatus string
	var hourlyRate float64
	var vehicleName string

	err = db.QueryRow("SELECT availability_status, hourly_rate, vehicle_name FROM Vehicles WHERE vehicle_id = ?", reservation.VehicleID).
		Scan(&availabilityStatus, &hourlyRate, &vehicleName)
	if err != nil {
		log.Println("Vehicle not found:", err)
		http.Error(w, "Vehicle not found", http.StatusNotFound)
		return
	}

	if availabilityStatus != "Available" {
		log.Printf("Vehicle %d is not available for booking\n", reservation.VehicleID)
		http.Error(w, "Vehicle is not available", http.StatusConflict)
		return
	}

	// Calculate total cost of reservation
	duration := reservation.EndTime.Sub(reservation.StartTime).Hours()
	if duration <= 0 {
		log.Println("Invalid reservation time range: end time must be after start time")
		http.Error(w, "Invalid reservation time range: end time must be after start time", http.StatusBadRequest)
		return
	}
	reservation.TotalCost = duration * hourlyRate

	log.Printf("Calculated Total Cost for Reservation: %.2f\n", reservation.TotalCost)

	// Insert reservation into Reservations table, including total_cost
	result, err := db.Exec("INSERT INTO Reservations (user_id, vehicle_id, start_time, end_time, status, total_cost) VALUES (?, ?, ?, ?, 'Active', ?)",
		reservation.UserID, reservation.VehicleID, reservation.StartTime, reservation.EndTime, reservation.TotalCost)
	if err != nil {
		log.Printf("Error inserting reservation into database: %v", err)
		http.Error(w, "Error making reservation", http.StatusInternalServerError)
		return
	}

	// Get the newly inserted reservation ID
	reservationID, _ := result.LastInsertId()
	reservation.ReservationID = int(reservationID)
	reservation.VehicleName = vehicleName

	log.Printf("Reservation successfully created with ID: %d\n", reservation.ReservationID)

	// Update vehicle availability status to Booked
	_, err = db.Exec("UPDATE Vehicles SET availability_status = 'Booked' WHERE vehicle_id = ?", reservation.VehicleID)
	if err != nil {
		log.Println("Error updating vehicle status to Booked:", err)
		http.Error(w, "Error updating vehicle status", http.StatusInternalServerError)
		return
	}

	// Respond with reservation details (including reservation_id)
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":        "Reservation created successfully",
		"reservation_id": reservation.ReservationID,
	})
}

// GetReservation handles fetching a reservation by ID
func GetReservation(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	reservationID := vars["reservation_id"]

	var reservation Reservation
	var createdAtString string

	// Updated SQL query to include `total_cost`
	query := `
        SELECT 
            r.reservation_id, 
            r.user_id, 
            r.vehicle_id, 
            v.vehicle_name,
			v.hourly_rate, 
            r.start_time, 
            r.end_time, 
            r.status, 
            r.total_cost, 
            r.created_at 
        FROM Reservations r
        JOIN Vehicles v ON r.vehicle_id = v.vehicle_id
        WHERE r.reservation_id = ?
    `
	err := db.QueryRow(query, reservationID).
		Scan(&reservation.ReservationID, &reservation.UserID, &reservation.VehicleID, &reservation.VehicleName, &reservation.HourlyRate, &reservation.StartTime, &reservation.EndTime, &reservation.Status, &reservation.TotalCost, &createdAtString)
	if err != nil {
		log.Printf("Error fetching reservation from database: %v", err)
		http.Error(w, "Reservation not found", http.StatusNotFound)
		return
	}

	// Respond with the reservation details
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(reservation)
}

// GetUserReservations handles fetching reservations for a specific user
func GetUserReservations(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID := vars["user_id"]

	// Query to get reservations for the user
	query := `
        SELECT 
            r.reservation_id, 
            r.user_id, 
            r.vehicle_id, 
            v.vehicle_name,
            v.hourly_rate, 
            r.start_time, 
            r.end_time, 
            r.status, 
            r.total_cost, 
            r.created_at 
        FROM Reservations r
        JOIN Vehicles v ON r.vehicle_id = v.vehicle_id
        WHERE r.user_id = ?
    `

	rows, err := db.Query(query, userID)
	if err != nil {
		log.Printf("Error fetching reservations for user %s from database: %v", userID, err)
		http.Error(w, "Error fetching reservations", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var reservations []Reservation
	for rows.Next() {
		var reservation Reservation
		var createdAtString string

		// Scan each row into a Reservation object
		err := rows.Scan(&reservation.ReservationID, &reservation.UserID, &reservation.VehicleID, &reservation.VehicleName, &reservation.HourlyRate, &reservation.StartTime, &reservation.EndTime, &reservation.Status, &reservation.TotalCost, &createdAtString)
		if err != nil {
			log.Printf("Error scanning reservation row: %v", err)
			http.Error(w, "Error fetching reservations", http.StatusInternalServerError)
			return
		}

		reservations = append(reservations, reservation)
	}

	// Respond with the list of reservations
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(reservations)
}

// UpdateReservation handles modifying an existing reservation
func UpdateReservation(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	reservationID := vars["reservation_id"]

	var updatedReservation struct {
		StartTime string `json:"start_time"`
		EndTime   string `json:"end_time"`
	}

	err := json.NewDecoder(r.Body).Decode(&updatedReservation)
	if err != nil {
		log.Println("Error decoding reservation input:", err)
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	// Validate times
	layout := time.RFC3339
	startTime, err := time.Parse(layout, updatedReservation.StartTime)
	if err != nil {
		log.Println("Error parsing StartTime:", err)
		http.Error(w, "Invalid start time format", http.StatusBadRequest)
		return
	}

	endTime, err := time.Parse(layout, updatedReservation.EndTime)
	if err != nil {
		log.Println("Error parsing EndTime:", err)
		http.Error(w, "Invalid end time format", http.StatusBadRequest)
		return
	}

	if endTime.Before(startTime) {
		log.Println("End time is before start time")
		http.Error(w, "End time must be after start time", http.StatusBadRequest)
		return
	}

	// Calculate new cost
	var hourlyRate float64
	err = db.QueryRow("SELECT hourly_rate FROM Vehicles v JOIN Reservations r ON v.vehicle_id = r.vehicle_id WHERE r.reservation_id = ?", reservationID).Scan(&hourlyRate)
	if err != nil {
		log.Println("Error fetching hourly rate:", err)
		http.Error(w, "Vehicle not found for reservation", http.StatusNotFound)
		return
	}

	duration := endTime.Sub(startTime).Hours()
	totalCost := duration * hourlyRate

	// Update reservation in database
	_, err = db.Exec("UPDATE Reservations SET start_time = ?, end_time = ?, total_cost = ? WHERE reservation_id = ?", startTime, endTime, totalCost, reservationID)
	if err != nil {
		log.Println("Error updating reservation:", err)
		http.Error(w, "Failed to update reservation", http.StatusInternalServerError)
		return
	}

	// Respond with success message
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Reservation updated successfully",
	})
}

// Cancel an existing reservation
func CancelReservation(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	reservationID := vars["reservation_id"]

	log.Printf("Attempting to cancel reservation with ID: %s", reservationID) // Log the reservation ID

	// Get vehicle ID associated with the reservation
	var vehicleID int
	err := db.QueryRow("SELECT vehicle_id FROM Reservations WHERE reservation_id = ? AND status = 'Active'", reservationID).Scan(&vehicleID)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("Reservation not found or already cancelled/completed: %s", reservationID)
			http.Error(w, "Reservation not found or already completed/cancelled", http.StatusNotFound)
		} else {
			log.Printf("Error fetching reservation for cancellation: %v", err)
			http.Error(w, "Error fetching reservation", http.StatusInternalServerError)
		}
		return
	}

	log.Printf("Found vehicle ID %d for reservation %s, proceeding to cancel", vehicleID, reservationID)

	// Update reservation status to Cancelled
	_, err = db.Exec("UPDATE Reservations SET status = 'Cancelled' WHERE reservation_id = ?", reservationID)
	if err != nil {
		log.Printf("Error cancelling reservation %s: %v", reservationID, err)
		http.Error(w, "Error cancelling reservation", http.StatusInternalServerError)
		return
	}

	log.Printf("Reservation %s successfully cancelled, updating vehicle availability", reservationID)

	// Update vehicle availability status to Available
	_, err = db.Exec("UPDATE Vehicles SET availability_status = 'Available' WHERE vehicle_id = ?", vehicleID)
	if err != nil {
		log.Printf("Error updating vehicle %d status to Available: %v", vehicleID, err)
		http.Error(w, "Error updating vehicle status", http.StatusInternalServerError)
		return
	}

	log.Printf("Vehicle %d successfully updated to Available", vehicleID)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Reservation cancelled successfully",
	})
}
