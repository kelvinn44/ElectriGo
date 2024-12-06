document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('user_id'); // Retrieve user_id from localStorage
    const vehiclesApiUrl = 'http://localhost:8081/v1/vehicles'; // Endpoint to get all vehicles

    // Fetch all vehicles from the API
    try {
        const response = await fetch(vehiclesApiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch available vehicles.');
        }

        const vehicles = await response.json();

        // Populate the vehicles into the container
        const vehiclesContainer = document.getElementById('vehiclesContainer');

        if (vehicles.length === 0) {
            vehiclesContainer.innerHTML = `<p>No vehicles available at the moment. Please check back later.</p>`;
        } else {
            vehicles.forEach(vehicle => {
                const vehicleCard = document.createElement('div');
                vehicleCard.classList.add('col-md-4', 'mb-4');

                // Generate HTML for each vehicle card
                vehicleCard.innerHTML = `
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">${vehicle.vehicle_name}</h5>
                            <p class="card-text">
                                License Plate: ${vehicle.license_plate}<br>
                                Hourly Rate: $${vehicle.hourly_rate.toFixed(2)}<br>
                                Status: ${vehicle.availability_status}
                            </p>
                            ${vehicle.availability_status === 'Available' ? `
                                <div class="mb-3">
                                    <label for="startDate${vehicle.vehicle_id}" class="form-label">Start Date and Time</label>
                                    <input type="datetime-local" class="form-control" id="startDate${vehicle.vehicle_id}">
                                </div>
                                <div class="mb-3">
                                    <label for="endDate${vehicle.vehicle_id}" class="form-label">End Date and Time</label>
                                    <input type="datetime-local" class="form-control" id="endDate${vehicle.vehicle_id}">
                                </div>
                                <button class="btn btn-primary" onclick="makeReservation(${vehicle.vehicle_id})">Reserve</button>
                            ` : `
                                <button class="btn btn-secondary" disabled>Not Available for Booking</button>
                            `}
                        </div>
                    </div>
                `;
                vehiclesContainer.appendChild(vehicleCard);
            });
        }
    } catch (error) {
        console.error('Error fetching available vehicles:', error);
        document.getElementById('vehiclesContainer').innerHTML = `<p>Failed to load vehicles. Please try again later.</p>`;
    }
});

async function makeReservation(vehicleId) {
    const startDate = document.getElementById(`startDate${vehicleId}`).value;
    const endDate = document.getElementById(`endDate${vehicleId}`).value;

    // Check if the start and end date and time have been selected
    if (!startDate || !endDate) {
        alert("Please select both start and end dates and times.");
        return;
    }

    const userId = localStorage.getItem('user_id');

    if (!userId) {
        alert("Please sign in to make a reservation.");
        return;
    }

    const reservationPayload = {
        user_id: parseInt(userId), // Ensure this is an integer
        vehicle_id: parseInt(vehicleId), // Ensure this is an integer
        start_time: new Date(startDate).toISOString(), // Convert date and time to ISO format
        end_time: new Date(endDate).toISOString() // Convert date and time to ISO format
    };

    console.log("Making reservation for user_id:", userId, "vehicle_id:", vehicleId);
    console.log("Start Date and Time:", startDate, "End Date and Time:", endDate);
    console.log("Reservation payload:", reservationPayload);
    console.log("Sending reservation request to:", 'http://localhost:8081/v1/bookings/reserve');

    try {
        const response = await fetch('http://localhost:8081/v1/bookings/reserve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(reservationPayload),
        });

        if (!response.ok) {
            const errorText = await response.text(); // Read the server response
            console.error("Error response from server:", errorText);
            throw new Error(errorText || 'Failed to make a reservation.');
        }

        const data = await response.json();
        console.log("Reservation created successfully, response data:", data);

        // Use the returned reservation_id to navigate to the checkout page
        const reservationId = data.reservation_id;
        alert('Reservation successful!');
        window.location.href = `checkout.html?reservation_id=${reservationId}`;

    } catch (error) {
        console.error('Error making reservation:', error);
        alert('Failed to make a reservation. Please try again later.');
    }
}

// Helper functions for sign-in/sign-out logic
function toggleSignIn() {
    const signInButton = document.getElementById('signInButton');
    if (signInButton.innerText === 'Sign In') {
        // If button is in "Sign In" state, redirect to sign-in page
        window.location.href = "signin_signup.html";
    } else {
        // If button is in "Log Out" state, log the user out and reset the UI
        signInButton.innerText = 'Sign In';

        // Change button color back to blue
        signInButton.classList.remove('btn-danger');
        signInButton.classList.add('btn-primary');

        // Remove user data from local storage
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('user_id');
        localStorage.removeItem('Email');
        localStorage.removeItem('Password');

        // Display alert when logging out
        alert("You have been logged out successfully!");
    }
}

function initializeSignInButton(signInButton) {
    // Check if the user is already logged in on page load
    if (localStorage.getItem('isLoggedIn') === 'true') {
        // User is logged in, update the button text to "Log Out"
        signInButton.innerText = 'Log Out';

        // Change button color to red to indicate log-out state
        signInButton.classList.remove('btn-primary');
        signInButton.classList.add('btn-danger');
    }
}
