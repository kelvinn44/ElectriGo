// Function to toggle sign-in state (Sign In / Log Out)
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
