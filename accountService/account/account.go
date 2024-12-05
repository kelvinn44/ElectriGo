package account

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"sync"
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
	dsn := "user:password@tcp(localhost:3306)/electrigo_accountdb"
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

type RegisterUserRequest struct {
	FirstName    string `json:"FirstName"`
	LastName     string `json:"LastName"`
	Email        string `json:"Email"`
	PasswordHash string `json:"PasswordHash"`
	Address      string `json:"Address"`
	DateOfBirth  string `json:"DateOfBirth"`
	Code         string `json:"Code"`
}

// In-memory store for verification codes
var verificationCodes = struct {
	sync.RWMutex
	data map[string]verificationCodeEntry
}{data: make(map[string]verificationCodeEntry)}

// Struct to hold verification code and its expiration time
type verificationCodeEntry struct {
	Code      string
	ExpiresAt time.Time
}

// Generate a random verification code
func generateVerificationCode() string {
	rand.Seed(time.Now().UnixNano())
	code := fmt.Sprintf("%06d", rand.Intn(1000000))
	return code
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

	// Generate a verification code
	code := generateVerificationCode()

	// Send the verification email
	err := sendVerificationEmail(request.Email, code)
	if err != nil {
		http.Error(w, "Failed to send verification code", http.StatusInternalServerError)
		return
	}

	// Store the code in the in-memory store with an expiration time (5 minutes)
	expirationTime := time.Now().Add(5 * time.Minute)

	verificationCodes.Lock()
	verificationCodes.data[request.Email] = verificationCodeEntry{
		Code:      code,
		ExpiresAt: expirationTime,
	}
	verificationCodes.Unlock()

	// Respond with success and include the code for debugging
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Verification code sent successfully.",
		"code":    code, // Include the code in the response for debugging purposes (remove in production)
	})
}

// Send email with verification code
func sendVerificationEmail(email, code string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", os.Getenv("GMAIL_EMAIL"))
	m.SetHeader("To", email)
	m.SetHeader("Subject", "Your Verification Code for Electrigo Account")
	m.SetBody("text/plain", "Here's your verification code: "+code+" \nThis code will expire in 5 minutes.")

	d := gomail.NewDialer("smtp.gmail.com", 587, os.Getenv("GMAIL_EMAIL"), os.Getenv("GMAIL_APP_PASSWORD"))

	return d.DialAndSend(m)
}

// Function to validate a verification code
func ValidateVerificationCode(email, code string) bool {
	verificationCodes.RLock()
	defer verificationCodes.RUnlock()

	entry, exists := verificationCodes.data[email]
	if !exists {
		return false // Code does not exist
	}

	if time.Now().After(entry.ExpiresAt) {
		return false // Code has expired
	}

	return entry.Code == code // Check if the code matches
}

func RegisterUser(w http.ResponseWriter, r *http.Request) {
	var req RegisterUserRequest

	// Decode the incoming request body into the RegisterUserRequest struct
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		log.Println("Error decoding request body:", err)
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	// Validate that required fields are present
	if req.FirstName == "" || req.LastName == "" || req.Email == "" || req.PasswordHash == "" || req.Address == "" || req.DateOfBirth == "" {
		log.Printf("Debugging: Missing required fields. User data: %+v\n", req)
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	// Validate the verification code
	if !ValidateVerificationCode(req.Email, req.Code) {
		log.Println("Invalid or expired verification code for email:", req.Email)
		http.Error(w, "Invalid or expired verification code", http.StatusUnauthorized)
		return
	}

	// Check if email already exists
	var exists bool
	err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = ?)", req.Email).Scan(&exists)
	if err != nil {
		log.Println("Error checking email existence:", err)
		http.Error(w, "Error checking email", http.StatusInternalServerError)
		return
	}

	if exists {
		log.Println("Email already in use for:", req.Email)
		http.Error(w, "Email already in use", http.StatusConflict)
		return
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.PasswordHash), bcrypt.DefaultCost)
	if err != nil {
		log.Println("Error hashing password:", err)
		http.Error(w, "Error hashing password", http.StatusInternalServerError)
		return
	}

	// Insert user into the database
	_, err = db.Exec("INSERT INTO users (email, password_hash, first_name, last_name, date_of_birth, address) VALUES (?, ?, ?, ?, ?, ?)",
		req.Email, hashedPassword, req.FirstName, req.LastName, req.DateOfBirth, req.Address)
	if err != nil {
		log.Println("Error inserting user into database:", err)
		http.Error(w, "Error registering user", http.StatusInternalServerError)
		return
	}

	// Respond with success
	log.Println("User registered successfully:", req.Email)
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "User registered successfully.",
	})
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
	var userID int
	err = db.QueryRow("SELECT user_id, password_hash FROM users WHERE email = ?", loginData.Email).Scan(&userID, &storedPasswordHash)
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

	// Respond with success JSON including user_id
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Login successful",
		"user_id": userID,
	})
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
