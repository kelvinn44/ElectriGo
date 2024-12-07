document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
        alert("Please log in to view your reservations.");
        window.location.href = "signin_signup.html";
        return;
    }

    const bookingsApiUrl = `http://localhost:8081/v1/bookings/user/${userId}`;

    try {
        const response = await fetch(bookingsApiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const bookingsContainer = document.getElementById('bookingsContainer');

        if (!response.ok) {
            // Display a message for fetch errors
            bookingsContainer.innerHTML = `<p class="text-danger">Failed to load reservations. Please try again later.</p>`;
            return;
        }

        const reservations = await response.json();

        // Ensure the response is an array
        if (!Array.isArray(reservations)) {
            console.warn("Unexpected response format:", reservations);
            bookingsContainer.innerHTML = `<p class="text-muted">You have no reservations at the moment.</p>`;
            return;
        }

        if (reservations.length === 0) {
            // Display a message if there are no reservations
            bookingsContainer.innerHTML = `<p class="text-muted">You have no reservations at the moment.</p>`;
        } else {
            // Sort reservations by reservation_id in descending order
            reservations.sort((a, b) => b.reservation_id - a.reservation_id);
            
            reservations.forEach(reservation => {
                const reservationCard = document.createElement('div');
                reservationCard.classList.add('col-md-4', 'mb-4');

                // Determine whether to show buttons based on status
                const isCompleted = reservation.status.toLowerCase() === 'completed';
                const isCancelled = reservation.status.toLowerCase() === 'cancelled';

                reservationCard.innerHTML = `
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">Reservation ID: ${reservation.reservation_id}</h5>
                            <p class="card-text">
                                Vehicle: ${reservation.vehicle_name}<br>
                                Start: ${new Date(reservation.start_time).toLocaleString()}<br>
                                End: ${new Date(reservation.end_time).toLocaleString()}<br>
                                Status: ${reservation.status}<br>
                                Total Cost: $${reservation.total_cost.toFixed(2)}
                            </p>
                            ${
                                !isCompleted && !isCancelled
                                    ? `
                                        <button class="btn btn-primary mb-2" onclick="modifyReservation(${reservation.reservation_id})">Modify</button>
                                        <button class="btn btn-danger" onclick="cancelReservation(${reservation.reservation_id})">Cancel</button>
                                    `
                                    : `
                                        <p class="text-secondary">${isCancelled ? "This reservation has been cancelled." : "This reservation is completed."}</p>
                                    `
                            }
                        </div>
                    </div>
                `;
                bookingsContainer.appendChild(reservationCard);
            });
        }
    } catch (error) {
        console.error('Error fetching reservations:', error);
        const bookingsContainer = document.getElementById('bookingsContainer');
        bookingsContainer.innerHTML = `<p class="text-danger">Failed to load reservations. Please try again later.</p>`;
    }
});

// Function to modify a reservation
async function modifyReservation(reservationId) {
    const newStartTime = prompt("Enter new start time (yyyy-mm-ddThh:mm:ssZ):");
    const newEndTime = prompt("Enter new end time (yyyy-mm-ddThh:mm:ssZ):");

    if (!newStartTime || !newEndTime) {
        alert("Modification cancelled.");
        return;
    }

    const payload = {
        start_time: newStartTime,
        end_time: newEndTime
    };

    try {
        const response = await fetch(`http://localhost:8081/v1/bookings/${reservationId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error('Failed to modify reservation.');
        }

        alert("Reservation modified successfully.");
        window.location.reload();
    } catch (error) {
        console.error('Error modifying reservation:', error);
        alert('Failed to modify reservation. Please try again later.');
    }
}

// Function to cancel a reservation
async function cancelReservation(reservationId) {
    if (!confirm("Are you sure you want to cancel this reservation?")) {
        return;
    }

    try {
        const response = await fetch(`http://localhost:8081/v1/reservations/${reservationId}/cancel`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to cancel reservation.');
        }

        alert("Reservation cancelled successfully.");
        window.location.reload();
    } catch (error) {
        console.error('Error cancelling reservation:', error);
        alert('Failed to cancel reservation. Please try again later.');
    }
}

// Helper functions for sign-in/sign-out logic
function toggleSignIn() {
    var signInButton = document.getElementById('signInButton');

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

// Check if the user is already logged in on page load
window.onload = function() {
    var signInButton = document.getElementById('signInButton');

    if (localStorage.getItem('isLoggedIn') === 'true') {
        // User is logged in, update the button text to "Log Out"
        signInButton.innerText = 'Log Out';

        // Change button color to red to indicate log-out state
        signInButton.classList.remove('btn-primary');
        signInButton.classList.add('btn-danger');
    }
};

// Set the event listener for the sign-in button
document.getElementById('signInButton').addEventListener('click', toggleSignIn);
