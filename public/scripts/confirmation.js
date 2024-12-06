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
                    <h5 class="card-title">Booking Confirmation</h5>
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

// Helper function for sign-in/sign-out logic
function toggleSignIn() {
    const signInButton = document.getElementById('signInButton');
    if (signInButton.innerText === 'Sign In') {
        // Redirect to the sign-in page if not signed in
        window.location.href = "signin_signup.html";
    } else {
        // If signed in, handle log out
        signInButton.innerText = 'Sign In';
        signInButton.classList.remove('btn-danger');
        signInButton.classList.add('btn-primary');

        // Remove user data from local storage
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('user_id');
        localStorage.removeItem('Email');
        localStorage.removeItem('Password');

        // Alert the user
        alert("You have been logged out successfully!");
    }
}
