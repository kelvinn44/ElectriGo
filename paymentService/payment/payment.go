package payment

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/gorilla/mux"
	"gopkg.in/gomail.v2"
)

// DB variable for global database connection for payment service
var db *sql.DB

// Initialize the payment database connection for payment service
func InitDB() {
	var err error
	dsn := "user:password@tcp(localhost:3306)/ElectriGo_BillingDB"
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal(err)
	}
	if err := db.Ping(); err != nil {
		log.Fatal(err)
	}
	log.Println("Billing Database connected successfully.")
}

// Payment Struct
type Payment struct {
	ReservationID int    `json:"reservation_id"`
	PaymentMethod string `json:"payment_method"`
	UserID        int    `json:"user_id"`
}

// Invoice Struct
type Invoice struct {
	InvoiceID          int     `json:"invoice_id"`
	ReservationID      int     `json:"reservation_id"`
	UserID             int     `json:"user_id"`
	TotalCost          float64 `json:"total_cost"`
	MembershipDiscount float64 `json:"membership_discount"`
	PromoDiscount      float64 `json:"promo_discount"`
	FinalAmount        float64 `json:"final_amount"`
	IssuedAt           string  `json:"issued_at"`
}

// Promotion struct represents a promotion in the system
type Promotion struct {
	PromoCode          string  `json:"promo_code"`
	DiscountPercentage float64 `json:"discount_percentage"`
	ValidFrom          string  `json:"valid_from"`
	ValidUntil         string  `json:"valid_until"`
}

// Function to create an invoice for a reservation
func CreateInvoice(reservationID int, userID int, totalCost float64, discount float64) (int64, error) {
	finalAmount := totalCost - discount

	// Insert the invoice into the `Invoices` table
	result, err := db.Exec("INSERT INTO Invoices (reservation_id, user_id, total_cost, membership_discount, final_amount) VALUES (?, ?, ?, ?, ?)",
		reservationID, userID, totalCost, discount, finalAmount)
	if err != nil {
		log.Println("Error creating invoice:", err)
		return 0, err
	}

	invoiceID, _ := result.LastInsertId()
	return invoiceID, nil
}

func MakePayment(w http.ResponseWriter, r *http.Request) {
	var paymentReq struct {
		ReservationID      int     `json:"reservation_id"`
		PaymentMethod      string  `json:"payment_method"`
		UserID             int     `json:"user_id"`
		TotalCost          float64 `json:"total_cost"`          // Total cost calculated by the frontend
		MembershipDiscount float64 `json:"membership_discount"` // Membership discount from frontend
		PromoDiscount      float64 `json:"promo_discount"`      // Promo discount from frontend
	}

	err := json.NewDecoder(r.Body).Decode(&paymentReq)
	if err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	// Check if an invoice already exists for the reservation
	var existingInvoiceID int
	err = db.QueryRow("SELECT invoice_id FROM Invoices WHERE reservation_id = ?", paymentReq.ReservationID).Scan(&existingInvoiceID)

	if err == sql.ErrNoRows {
		// Create a new invoice if none exists

		// Fetch user email and name
		var userEmail, userName string
		err = db.QueryRow("SELECT email, CONCAT(first_name, ' ', last_name) FROM ElectriGo_AccountDB.Users WHERE user_id = ?", paymentReq.UserID).Scan(&userEmail, &userName)
		if err != nil {
			log.Println("Error fetching user details:", err)
			http.Error(w, "Error fetching user details", http.StatusInternalServerError)
			return
		}

		// Calculate the final amount based on discounts
		finalAmount := paymentReq.TotalCost - paymentReq.MembershipDiscount - paymentReq.PromoDiscount

		// Create the invoice
		result, err := db.Exec(
			"INSERT INTO Invoices (reservation_id, user_id, total_cost, membership_discount, promo_discount, final_amount) VALUES (?, ?, ?, ?, ?, ?)",
			paymentReq.ReservationID, paymentReq.UserID, paymentReq.TotalCost, paymentReq.MembershipDiscount, paymentReq.PromoDiscount, finalAmount,
		)
		if err != nil {
			log.Println("Error creating invoice:", err)
			http.Error(w, "Error creating invoice", http.StatusInternalServerError)
			return
		}

		invoiceID, _ := result.LastInsertId()
		existingInvoiceID = int(invoiceID)

		// Send the invoice email
		invoice := Invoice{
			InvoiceID:          existingInvoiceID,
			ReservationID:      paymentReq.ReservationID,
			UserID:             paymentReq.UserID,
			TotalCost:          paymentReq.TotalCost,
			MembershipDiscount: paymentReq.MembershipDiscount,
			PromoDiscount:      paymentReq.PromoDiscount,
			FinalAmount:        finalAmount,
			IssuedAt:           time.Now().Format("2006-01-02 15:04:05"),
		}

		err = SendInvoiceEmail(invoice, paymentReq.PromoDiscount, userEmail, userName)
		if err != nil {
			log.Printf("Error sending invoice email: %v", err)
			// Continue; don't fail the entire operation if email fails
		}

		// Update the reservation's total cost
		_, err = db.Exec(
			"UPDATE ElectriGo_VehicleDB.Reservations SET total_cost = ? WHERE reservation_id = ?",
			finalAmount, paymentReq.ReservationID,
		)
		if err != nil {
			log.Printf("Error updating reservation total cost: %v", err)
			http.Error(w, "Error updating reservation total cost", http.StatusInternalServerError)
			return
		}
	} else if err != nil {
		log.Println("Error checking for existing invoice:", err)
		http.Error(w, "Error processing payment", http.StatusInternalServerError)
		return
	}

	// Record the payment transaction
	_, err = db.Exec("INSERT INTO PaymentTransactions (user_id, invoice_id, payment_method, payment_status) VALUES (?, ?, ?, 'Completed')",
		paymentReq.UserID, existingInvoiceID, paymentReq.PaymentMethod)
	if err != nil {
		log.Println("Error processing payment:", err)
		http.Error(w, "Error processing payment", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Payment processed successfully.",
	})
}

// GetInvoicesByUser fetches all invoices for a specific user
func GetInvoicesByUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID := vars["user_id"]

	var invoices []Invoice
	query := `
        SELECT invoice_id, reservation_id, user_id, total_cost, membership_discount, final_amount, issued_at
        FROM Invoices
        WHERE user_id = ?
    `

	rows, err := db.Query(query, userID)
	if err != nil {
		log.Printf("Error fetching invoices for user %s: %v", userID, err)
		http.Error(w, "Error fetching invoices", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var invoice Invoice
		if err := rows.Scan(&invoice.InvoiceID, &invoice.ReservationID, &invoice.UserID, &invoice.TotalCost, &invoice.MembershipDiscount, &invoice.FinalAmount, &invoice.IssuedAt); err != nil {
			log.Printf("Error scanning invoice data: %v", err)
			http.Error(w, "Error processing invoices", http.StatusInternalServerError)
			return
		}
		invoices = append(invoices, invoice)
	}

	if err := rows.Err(); err != nil {
		log.Printf("Error iterating over invoices: %v", err)
		http.Error(w, "Error processing invoices", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(invoices)
}

func SendInvoiceEmail(invoice Invoice, promoDiscount float64, userEmail string, userName string) error {
	// Construct the email body with detailed invoice information
	emailBody := fmt.Sprintf(`
		<h2>ElectriGo Invoice</h2>
		<p>Dear %s,</p>
		<p>Thank you for using ElectriGo. Below are the details of your recent booking:</p>
		
		<table border="1" cellpadding="5" cellspacing="0">
			<tr>
				<th>Invoice ID</th>
				<th>Reservation ID</th>
				<th>Base Cost</th>
				<th>Membership Discount</th>
				<th>Promo Discount</th>
				<th>Final Amount</th>
				<th>Issued At</th>
			</tr>
			<tr>
				<td>%d</td>
				<td>%d</td>
				<td>$%.2f</td>
				<td>-$%.2f</td>
				<td>-$%.2f</td>
				<td>$%.2f</td>
				<td>%s</td>
			</tr>
		</table>
		
		<p>If you have any questions, feel free to contact us at support@electrigo.com or from the sender email address.</p>
		<p>Thank you for choosing ElectriGo!</p>
	`, userName, invoice.InvoiceID, invoice.ReservationID, invoice.TotalCost, invoice.MembershipDiscount, promoDiscount, invoice.FinalAmount, invoice.IssuedAt)

	// Set up the email message
	mail := gomail.NewMessage()
	mail.SetHeader("From", os.Getenv("GMAIL_EMAIL"))
	mail.SetHeader("To", userEmail)
	mail.SetHeader("Subject", fmt.Sprintf("ElectriGo Invoice for Reservation #%d", invoice.ReservationID))
	mail.SetBody("text/html", emailBody)

	// Configure the SMTP server
	dialer := gomail.NewDialer("smtp.gmail.com", 587, os.Getenv("GMAIL_EMAIL"), os.Getenv("GMAIL_APP_PASSWORD"))

	// Send the email
	err := dialer.DialAndSend(mail)
	if err != nil {
		return fmt.Errorf("failed to send email: %v", err)
	}

	return nil
}

func ApplyPromoCode(w http.ResponseWriter, r *http.Request) {
	type PromoRequest struct {
		PromoCode     string `json:"promo_code"`
		ReservationID int    `json:"reservation_id"`
	}

	type PromoResponse struct {
		DiscountPercentage  float64 `json:"discount_percentage"`
		DiscountAmount      float64 `json:"discount_amount"`
		TotalCostAfterPromo float64 `json:"total_cost_after_promo"`
	}

	var req PromoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if req.PromoCode == "" || req.ReservationID == 0 {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	// Step 1: Fetch reservation total cost
	var totalCost float64
	err := db.QueryRow(`
        SELECT total_cost 
        FROM ElectriGo_VehicleDB.Reservations 
        WHERE reservation_id = ?
    `, req.ReservationID).Scan(&totalCost)

	if err == sql.ErrNoRows {
		log.Printf("Reservation %d not found", req.ReservationID)
		http.Error(w, "Reservation not found", http.StatusNotFound)
		return
	} else if err != nil {
		log.Printf("Error fetching reservation: %v", err)
		http.Error(w, "Error fetching reservation", http.StatusInternalServerError)
		return
	}

	// Step 2: Validate promo code
	var discountPercentage float64
	var validFrom, validUntil string
	err = db.QueryRow(`
        SELECT discount_percentage, valid_from, valid_until 
        FROM Promotions 
        WHERE promo_code = ? AND CURDATE() BETWEEN valid_from AND valid_until
    `, req.PromoCode).Scan(&discountPercentage, &validFrom, &validUntil)

	if err == sql.ErrNoRows {
		log.Printf("Invalid or expired promo code: %s", req.PromoCode)
		http.Error(w, "Promo code is invalid or expired", http.StatusNotFound)
		return
	} else if err != nil {
		log.Printf("Error fetching promo code: %v", err)
		http.Error(w, "Error validating promo code", http.StatusInternalServerError)
		return
	}

	// Step 3: Calculate discount and updated cost
	discountAmount := totalCost * (discountPercentage / 100)
	totalCostAfterPromo := totalCost - discountAmount

	// Step 4: Update the reservation total cost in the database
	_, err = db.Exec(`
        UPDATE ElectriGo_VehicleDB.Reservations 
        SET total_cost = ? 
        WHERE reservation_id = ?
    `, totalCostAfterPromo, req.ReservationID)

	if err != nil {
		log.Printf("Error updating reservation total cost in Reservations table: %v", err)
		http.Error(w, "Error updating reservation total cost", http.StatusInternalServerError)
		return
	}

	// Step 5: Respond with discount details
	response := PromoResponse{
		DiscountPercentage:  discountPercentage,
		DiscountAmount:      discountAmount,
		TotalCostAfterPromo: totalCostAfterPromo,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
