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
	dsn := "user:password@tcp(localhost:3306)/ElectriGo_VehicleDB"
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
	StartTime     time.Time `json:"start_time"`
	EndTime       time.Time `json:"end_time"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
}

// Make a new reservation
func MakeReservation(w http.ResponseWriter, r *http.Request) {
	var reservation Reservation
	err := json.NewDecoder(r.Body).Decode(&reservation)
	if err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	// Check if the vehicle is available
	var availabilityStatus string
	err = db.QueryRow("SELECT availability_status FROM Vehicles WHERE vehicle_id = ?", reservation.VehicleID).Scan(&availabilityStatus)
	if err != nil {
		http.Error(w, "Vehicle not found", http.StatusNotFound)
		return
	}
	if availabilityStatus != "Available" {
		http.Error(w, "Vehicle is not available", http.StatusConflict)
		return
	}

	// Insert reservation into Reservations table
	_, err = db.Exec("INSERT INTO Reservations (user_id, vehicle_id, start_time, end_time, status) VALUES (?, ?, ?, ?, 'Active')",
		reservation.UserID, reservation.VehicleID, reservation.StartTime, reservation.EndTime)
	if err != nil {
		http.Error(w, "Error making reservation", http.StatusInternalServerError)
		return
	}

	// Update vehicle availability status to Booked
	_, err = db.Exec("UPDATE Vehicles SET availability_status = 'Booked' WHERE vehicle_id = ?", reservation.VehicleID)
	if err != nil {
		http.Error(w, "Error updating vehicle status", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Reservation created successfully",
	})
}

// Cancel an existing reservation
func CancelReservation(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	reservationID := vars["reservation_id"]

	// Get vehicle ID associated with the reservation
	var vehicleID int
	err := db.QueryRow("SELECT vehicle_id FROM Reservations WHERE reservation_id = ? AND status = 'Active'", reservationID).Scan(&vehicleID)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Reservation not found or already completed/cancelled", http.StatusNotFound)
		} else {
			http.Error(w, "Error fetching reservation", http.StatusInternalServerError)
		}
		return
	}

	// Update reservation status to Cancelled
	_, err = db.Exec("UPDATE Reservations SET status = 'Cancelled' WHERE reservation_id = ?", reservationID)
	if err != nil {
		http.Error(w, "Error cancelling reservation", http.StatusInternalServerError)
		return
	}

	// Update vehicle availability status to Available
	_, err = db.Exec("UPDATE Vehicles SET availability_status = 'Available' WHERE vehicle_id = ?", vehicleID)
	if err != nil {
		http.Error(w, "Error updating vehicle status", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Reservation cancelled successfully",
	})
}
