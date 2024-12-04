package account

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/gorilla/mux"
	"golang.org/x/crypto/bcrypt"
	"gopkg.in/gomail.v2"
)

// DB variable for global database connection
var db *sql.DB

// Initialize the database connection
func InitDB() {
	var err error
	// Connect to the MySQL database
	dsn := "root:password@tcp(localhost:3306)/electrigo_accountdb"
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal(err)
	}
	if err := db.Ping(); err != nil {
		log.Fatal(err)
	}
	fmt.Println("Database connected successfully.")
}

// User struct represents a user in the system
type User struct {
	UserID         int    `json:"user_id"`
	Email          string `json:"email"`
	PasswordHash   string `json:"password_hash"`
	MembershipTier string `json:"membership_tier"`
	FirstName      string `json:"first_name"`
	LastName       string `json:"last_name"`
	DateOfBirth    string `json:"date_of_birth"`
	Address        string `json:"address"`
}

// Generate a random verification code
func generateVerificationCode() string {
	rand.Seed(time.Now().UnixNano())
	code := fmt.Sprintf("%06d", rand.Intn(1000000))
	return code
}

// Send email with verification code
func sendVerificationEmail(email, code string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", os.Getenv("GMAIL_EMAIL"))
	m.SetHeader("To", email)
	m.SetHeader("Subject", "Your Verification Code")
	m.SetBody("text/plain", "Your verification code is: "+code)

	d := gomail.NewDialer("smtp.gmail.com", 587, os.Getenv("GMAIL_EMAIL"), os.Getenv("GMAIL_APP_PASSWORD"))

	return d.DialAndSend(m)
}

// Request Verification Code API Handler
func RequestVerificationCode(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Email string `json:"Email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	code := generateVerificationCode()
	err := sendVerificationEmail(request.Email, code)
	if err != nil {
		http.Error(w, "Failed to send verification code", http.StatusInternalServerError)
		return
	}

	// For demo purposes, store code temporarily (in a real app, this should be stored in a DB with expiration time)
	// Save to DB or in-memory store

	// Respond with the verification code (for the demo)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"code":    code,
	})
}

// Register a new user
func RegisterUser(w http.ResponseWriter, r *http.Request) {
	// Parse JSON from request body
	var user User
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	// Check if email already exists
	var exists bool
	err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = ?)", user.Email).Scan(&exists)
	if err != nil {
		http.Error(w, "Error checking email", http.StatusInternalServerError)
		return
	}

	if exists {
		http.Error(w, "Email already in use", http.StatusConflict)
		return
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.PasswordHash), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Error hashing password", http.StatusInternalServerError)
		return
	}

	// Insert user into database
	_, err = db.Exec("INSERT INTO users (email, password_hash, first_name, last_name, date_of_birth, address) VALUES (?, ?, ?, ?, ?, ?)",
		user.Email, hashedPassword, user.FirstName, user.LastName, user.DateOfBirth, user.Address)
	if err != nil {
		http.Error(w, "Error registering user", http.StatusInternalServerError)
		return
	}

	// Respond with success
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

// Login a user and check credentials
func LoginUser(w http.ResponseWriter, r *http.Request) {
	// Parse JSON from request body
	var loginData struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	err := json.NewDecoder(r.Body).Decode(&loginData)
	if err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	// Get the stored password hash for the user
	var storedPasswordHash string
	err = db.QueryRow("SELECT password_hash FROM users WHERE email = ?", loginData.Email).Scan(&storedPasswordHash)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		} else {
			http.Error(w, "Error checking credentials", http.StatusInternalServerError)
		}
		return
	}

	// Compare the password with the stored hash
	err = bcrypt.CompareHashAndPassword([]byte(storedPasswordHash), []byte(loginData.Password))
	if err != nil {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	// Successful login
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Login successful"))
}

// Update user profile
func UpdateUserProfile(w http.ResponseWriter, r *http.Request) {
	// Parse JSON from request body
	var user User
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	// Update user in the database
	_, err = db.Exec("UPDATE users SET first_name = ?, last_name = ?, date_of_birth = ?, address = ? WHERE user_id = ?",
		user.FirstName, user.LastName, user.DateOfBirth, user.Address, user.UserID)
	if err != nil {
		http.Error(w, "Error updating user profile", http.StatusInternalServerError)
		return
	}

	// Respond with success
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(user)
}

// Get user profile
func GetUserProfile(w http.ResponseWriter, r *http.Request) {
	// Get user ID from URL parameters
	vars := mux.Vars(r)
	userID := vars["user_id"]

	// Retrieve user profile from the database
	var user User
	err := db.QueryRow("SELECT user_id, email, membership_tier, first_name, last_name, date_of_birth, address FROM users WHERE user_id = ?", userID).Scan(
		&user.UserID, &user.Email, &user.MembershipTier, &user.FirstName, &user.LastName, &user.DateOfBirth, &user.Address,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
		} else {
			http.Error(w, "Error retrieving user profile", http.StatusInternalServerError)
		}
		return
	}

	// Respond with user profile
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(user)
}
