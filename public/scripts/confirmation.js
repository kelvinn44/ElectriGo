document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const reservationId = urlParams.get('reservation_id');
    const userId = localStorage.getItem('user_id');

    if (!reservationId) {
        alert("Invalid reservation. Redirecting to vehicles page.");
        window.location.href = "vehicles.html";
        return;
    }

    const checkoutApiUrl = `http://localhost:8081/v1/bookings/${reservationId}`;

    try {
        // Fetch reservation details from the server
        const response = await fetch(checkoutApiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch reservation details.');
        }

        const reservation = await response.json();

        // Populate the confirmation details
        const confirmationDetails = document.getElementById('confirmationDetails');
        confirmationDetails.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <p class="card-text"><strong>Booking ID:</strong> ${reservation.reservation_id}</p>
                    <p class="card-text"><strong>Vehicle:</strong> ${reservation.vehicle_name}</p>
                    <p class="card-text"><strong>Start Date & Time:</strong> ${new Date(reservation.start_time).toLocaleString()}</p>
                    <p class="card-text"><strong>End Date & Time:</strong> ${new Date(reservation.end_time).toLocaleString()}</p>
                    <p class="card-text"><strong>Total Cost:</strong> $${reservation.total_cost.toFixed(2)}</p>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error fetching reservation details:', error);
        alert('Failed to load reservation details. Please try again later.');
    }
});

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

