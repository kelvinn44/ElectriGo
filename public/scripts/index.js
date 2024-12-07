// Function to toggle sign-in state (Sign In / Log Out)
function toggleSignIn() {
    var signInButton = document.getElementById('signInButton');

    if (signInButton.innerText === 'Sign In') {
        // Redirect to sign-in page
        window.location.href = "signin_signup.html";
    } else {
        // Log out the user
        signInButton.innerText = 'Sign In';

        // Change button back to blue
        signInButton.classList.remove('btn-danger');
        signInButton.classList.add('btn-primary');

        // Remove user data from local storage
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('user_id');

        // Update booking buttons to redirect to sign-in page
        updateBookingButtons(false);

        // Display logout message
        alert("You have been logged out successfully!");
    }
}

// Update booking buttons based on login state
function updateBookingButtons(isLoggedIn) {
    const promoButton = document.querySelector('.alert a'); // Book Now in the promo banner
    const startBookingButton = document.querySelector('.jumbotron a.btn-success'); // Start Booking button

    if (isLoggedIn) {
        // Redirect to vehicles page if logged in
        if (promoButton) promoButton.href = "vehicles.html";
        if (startBookingButton) startBookingButton.href = "vehicles.html";
    } else {
        // Redirect to sign-in page if not logged in
        if (promoButton) promoButton.href = "signin_signup.html";
        if (startBookingButton) startBookingButton.href = "signin_signup.html";
    }
}

// Check login status on page load
window.onload = function () {
    var signInButton = document.getElementById('signInButton');
    var isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    if (isLoggedIn) {
        // Update sign-in button to "Log Out"
        signInButton.innerText = 'Log Out';
        signInButton.classList.remove('btn-primary');
        signInButton.classList.add('btn-danger');
    }

    // Update booking buttons based on login state
    updateBookingButtons(isLoggedIn);
};

// Add event listener to the sign-in button
document.getElementById('signInButton').addEventListener('click', toggleSignIn);
