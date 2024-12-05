package car

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	_ "github.com/go-sql-driver/mysql"
)

// DB variable for global database connection for car service
var db *sql.DB

// Initialize the database connection for car service
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
	fmt.Println("Vehicle Database connected successfully.")
}

// Vehicle struct represents a vehicle
type Vehicle struct {
	VehicleID          int     `json:"vehicle_id"`
	VehicleName        string  `json:"vehicle_name"`
	LicensePlate       string  `json:"license_plate"`
	AvailabilityStatus string  `json:"availability_status"`
	HourlyRate         float64 `json:"hourly_rate"`
}

// Get all vehicles, regardless of availability status
func GetAllVehicles(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT vehicle_id, vehicle_name, license_plate, availability_status, hourly_rate FROM Vehicles")
	if err != nil {
		http.Error(w, "Error fetching vehicles", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var vehicles []Vehicle
	for rows.Next() {
		var vehicle Vehicle
		if err := rows.Scan(&vehicle.VehicleID, &vehicle.VehicleName, &vehicle.LicensePlate, &vehicle.AvailabilityStatus, &vehicle.HourlyRate); err != nil {
			http.Error(w, "Error scanning vehicle data", http.StatusInternalServerError)
			return
		}
		vehicles = append(vehicles, vehicle)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(vehicles)
}
