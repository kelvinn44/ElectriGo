document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('user_id'); // Retrieve user_id from localStorage
    const apiUrl = `http://localhost:8080/v1/account/user/${userId}`; // Corrected userId usage

    // If the user is not logged in (user_id is missing), redirect to sign-in page
    if (!userId) {
        window.location.href = 'signin_signup.html'; // Redirect to sign-in page if not logged in
        return; // Stop further script execution
    }

    try {
        // Fetch user data from the API
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            // Handle response errors like 401 or 403 by redirecting
            if (response.status === 401 || response.status === 403) {
                alert('You are not authorized. Please log in again.');
                localStorage.clear(); // Clear potentially invalid user data
                window.location.href = 'signin_signup.html'; // Redirect to sign-in
                return;
            } else {
                throw new Error('Failed to fetch user data.');
            }
        }

        // Parse user data and populate the form fields
        const userData = await response.json();
        document.getElementById('email').value = userData.email || '';
        document.getElementById('firstName').value = userData.first_name || '';
        document.getElementById('lastName').value = userData.last_name || '';
        document.getElementById('dob').value = userData.date_of_birth || '';
        document.getElementById('address').value = userData.address || '';

        // Display membership status, with a null check for the element
        const membershipStatusElement = document.getElementById('membershipStatus');
        if (membershipStatusElement) {
            membershipStatusElement.innerText = `Membership Tier: ${userData.membership_tier || 'N/A'}`;
        } else {
            console.error('Error: membershipStatus element not found.');
        }

    } catch (error) {
        console.error('Error fetching user data:', error);
        alert('Failed to load your account information. Please try again later.');
    }

    // Handle log out
    document.getElementById('logoutButton').addEventListener('click', () => {
        localStorage.clear(); // Clear all user data from localStorage
        alert('You have been logged out.');
        window.location.href = 'index.html'; // Redirect to the home page
    });

    // Handle form update
    document.getElementById('updateButton').addEventListener('click', async () => {
        // Capture updated form data
        const updatedUserData = {
            user_id: parseInt(userId),  // Ensure the user ID is included and is a number
            first_name: document.getElementById('firstName').value.trim(),
            last_name: document.getElementById('lastName').value.trim(),
            date_of_birth: document.getElementById('dob').value,
            address: document.getElementById('address').value.trim(),
        };

        // Validate that all fields are filled in correctly
        if (!updatedUserData.first_name || !updatedUserData.last_name || !updatedUserData.date_of_birth || !updatedUserData.address) {
            alert("Please fill in all fields.");
            return;
        }

        try {
            // Send updated data to the API
            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedUserData),
            });

            if (!response.ok) {
                // Log the error for debugging
                const errorData = await response.json();
                console.error("Error response from server:", errorData);
                throw new Error('Failed to update user data.');
            }

            alert('Your information has been updated successfully.');
        } catch (error) {
            console.error('Error updating user data:', error);
            alert('Failed to update your information. Please try again later.');
        }
    });
});
