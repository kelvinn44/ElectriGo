-- Drop existing databases if they exist, to start from a clean state
-- First drop constraints that might prevent tables from being deleted properly

USE ElectriGo_BillingDB;

-- Drop foreign key constraints
ALTER TABLE PaymentTransactions DROP FOREIGN KEY paymenttransactions_ibfk_1;
ALTER TABLE PaymentTransactions DROP FOREIGN KEY paymenttransactions_ibfk_2;
ALTER TABLE Invoices DROP FOREIGN KEY invoices_ibfk_1;
ALTER TABLE Invoices DROP FOREIGN KEY invoices_ibfk_2;

-- Drop tables
DROP TABLE IF EXISTS PaymentTransactions;
DROP TABLE IF EXISTS Invoices;
DROP TABLE IF EXISTS Promotions;

USE ElectriGo_VehicleDB;

-- Drop foreign key constraints
ALTER TABLE Reservations DROP FOREIGN KEY reservations_ibfk_1;
ALTER TABLE Reservations DROP FOREIGN KEY reservations_ibfk_2;
ALTER TABLE ReservationHistory DROP FOREIGN KEY reservationhistory_ibfk_1;

-- Drop tables
DROP TABLE IF EXISTS ReservationHistory;
DROP TABLE IF EXISTS Reservations;
DROP TABLE IF EXISTS Vehicles;

USE ElectriGo_AccountDB;

-- Drop tables
DROP TABLE IF EXISTS Users;

-- Drop databases
DROP DATABASE IF EXISTS ElectriGo_AccountDB;
DROP DATABASE IF EXISTS ElectriGo_VehicleDB;
DROP DATABASE IF EXISTS ElectriGo_BillingDB;

-- Recreate databases
CREATE DATABASE ElectriGo_AccountDB;
CREATE DATABASE ElectriGo_VehicleDB;
CREATE DATABASE ElectriGo_BillingDB;

-- Use AccountDB
USE ElectriGo_AccountDB;

-- Create Users Table
CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    membership_tier ENUM('Basic', 'Premium', 'VIP') DEFAULT 'Basic',
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    date_of_birth DATE,
    address VARCHAR(255),
    rental_history JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert Sample Data into Users
INSERT INTO Users (email, password_hash, membership_tier, first_name, last_name, date_of_birth, address)
VALUES 
('john.doe@example.com', '$2a$10$eAIugi6UQSOH89HbqMz49.GgYw0blDJwm3tzf..SlW/um9wtyWYtK', 'Basic', 'John', 'Doe', '1990-01-01', '123 Test Street, Singapore'),
('jane.smith@example.com', '$2a$10$eAIugi6UQSOH89HbqMz49.GgYw0blDJwm3tzf..SlW/um9wtyWYtK', 'Premium', 'Jane', 'Smith', '1985-05-15', '456 Elm Street, Singapore'),
('alice.brown@example.com', '$2a$10$eAIugi6UQSOH89HbqMz49.GgYw0blDJwm3tzf..SlW/um9wtyWYtK', 'Basic', 'Alice', 'Brown', '1995-02-20', '789 Oak Street, Singapore'),
('bob.white@example.com', '$2a$10$eAIugi6UQSOH89HbqMz49.GgYw0blDJwm3tzf..SlW/um9wtyWYtK', 'VIP', 'Bob', 'White', '1980-11-30', '123 Pine Street, Singapore'),
('charlie.gray@example.com', '$2a$10$eAIugi6UQSOH89HbqMz49.GgYw0blDJwm3tzf..SlW/um9wtyWYtK', 'Basic', 'Charlie', 'Gray', '1992-06-15', '321 Maple Street, Singapore'); -- Charlie is one booking away from Premium

-- Use VehicleDB
USE ElectriGo_VehicleDB;

-- Create Vehicles Table
CREATE TABLE Vehicles (
    vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_name VARCHAR(100) NOT NULL,
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    availability_status ENUM('Available', 'Booked', 'Maintenance') DEFAULT 'Available',
    hourly_rate DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create Reservations Table
CREATE TABLE Reservations (
    reservation_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('Active', 'Completed', 'Cancelled') DEFAULT 'Active',
    total_cost DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES ElectriGo_AccountDB.Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES Vehicles(vehicle_id) ON DELETE CASCADE
);

-- Create ReservationHistory Table
CREATE TABLE ReservationHistory (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    modification_details TEXT,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reservation_id) REFERENCES Reservations(reservation_id) ON DELETE CASCADE
);

-- Insert Sample Data into VehicleDB
INSERT INTO Vehicles (vehicle_name, license_plate, availability_status, hourly_rate)
VALUES
('Tesla Model 3', 'EV1234A', 'Available', 20.00),
('Nissan Leaf', 'EV5678B', 'Booked', 15.00),
('Chevrolet Bolt', 'EV9101C', 'Maintenance', 18.00),
('BMW i3', 'EV2022D', 'Available', 25.00),
('Hyundai Kona EV', 'EV3033E', 'Available', 22.00);

-- Insert Sample Data into Reservations with historical dates
INSERT INTO Reservations (user_id, vehicle_id, start_time, end_time, status, total_cost)
VALUES 
(1, 1, '2024-11-10 09:00:00', '2024-11-10 15:00:00', 'Completed', 120.00), -- John Doe
(2, 2, '2024-11-11 09:00:00', '2024-11-11 15:00:00', 'Completed', 90.00), -- Jane Smith
(3, 3, '2024-11-12 09:00:00', '2024-11-12 15:00:00', 'Cancelled', 0.00), -- Alice Brown
(4, 4, '2024-11-13 09:00:00', '2024-11-13 15:00:00', 'Completed', 150.00), -- Bob White
(5, 1, '2024-11-14 10:00:00', '2024-11-14 16:00:00', 'Completed', 130.00), -- Charlie Gray
(5, 2, '2024-11-15 09:00:00', '2024-11-15 12:00:00', 'Completed', 45.00), -- Charlie Gray
(5, 4, '2024-11-16 13:00:00', '2024-11-16 15:00:00', 'Completed', 50.00), -- Charlie Gray
(5, 5, '2024-11-17 08:00:00', '2024-11-17 10:00:00', 'Completed', 44.00); -- Charlie Gray

-- Use BillingDB
USE ElectriGo_BillingDB;

-- Create Invoices Table
CREATE TABLE Invoices (
    invoice_id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    user_id INT NOT NULL,
    total_cost DECIMAL(10, 2),
    membership_discount DECIMAL(10, 2) DEFAULT 0,
    promo_discount DECIMAL(10, 2) DEFAULT 0,
    final_amount DECIMAL(10, 2),
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reservation_id) REFERENCES ElectriGo_VehicleDB.Reservations(reservation_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES ElectriGo_AccountDB.Users(user_id) ON DELETE CASCADE
);

-- Create Promotions Table
CREATE TABLE Promotions (
    promo_id INT AUTO_INCREMENT PRIMARY KEY,
    promo_code VARCHAR(50) UNIQUE NOT NULL,
    discount_percentage DECIMAL(5, 2),
    valid_from DATE,
    valid_until DATE
);

-- Create PaymentTransactions Table
CREATE TABLE PaymentTransactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    invoice_id INT NOT NULL,
    payment_method ENUM('BankTransfer', 'PayNow') NOT NULL,
    payment_status ENUM('Pending', 'Completed', 'Failed') DEFAULT 'Pending',
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES ElectriGo_AccountDB.Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES Invoices(invoice_id) ON DELETE CASCADE
);

-- Insert Sample Data into BillingDB
INSERT INTO Promotions (promo_code, discount_percentage, valid_from, valid_until)
VALUES 
('NEWYEAR2025', 10.00, '2024-12-01', '2025-01-31'),
('SPRINGSALE', 15.00, '2025-03-01', '2025-03-31');

-- Insert Sample Data into Invoices table
INSERT INTO Invoices (reservation_id, user_id, total_cost, membership_discount, final_amount)
VALUES
(1, 1, 120.00, 0.00, 120.00),
(2, 2, 90.00, 10.00, 81.00),
(4, 4, 150.00, 15.00, 127.50),
(5, 5, 130.00, 0.00, 130.00),
(6, 5, 45.00, 0.00, 45.00),
(7, 5, 50.00, 0.00, 50.00),
(8, 5, 44.00, 0.00, 44.00);

-- Insert into PaymentTransactions table
INSERT INTO PaymentTransactions (user_id, invoice_id, payment_method, payment_status)
VALUES 
(1, 1, 'PayNow', 'Completed'),
(2, 2, 'BankTransfer', 'Completed'),
(4, 3, 'PayNow', 'Pending'),
(5, 4, 'BankTransfer', 'Completed'),
(5, 5, 'PayNow', 'Completed'),
(5, 6, 'PayNow', 'Completed');
