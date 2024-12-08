document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('user_id'); // Retrieve user_id from localStorage
    const userApiUrl = `http://localhost:8080/v1/account/user/${userId}`;
    const reservationsApiUrl = `http://localhost:8080/v1/bookings/user/${userId}/total`;

    // If the user is not logged in (user_id is missing), redirect to sign-in page
    if (!userId) {
        window.location.href = 'signin_signup.html'; // Redirect to sign-in page if not logged in
        return; // Stop further script execution
    }

    try {
        // Fetch user data from the API
        const response = await fetch(userApiUrl, {
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

        // Fetch total bookings (reservations) from the API
        const reservationsResponse = await fetch(reservationsApiUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!reservationsResponse.ok) {
            throw new Error("Failed to fetch total reservations.");
        }

        const totalReservations = (await reservationsResponse.json()).total_reservations;

        // Determine membership tier
        let currentTier = userData.membership_tier || "Basic";
        let progressMessage = "";
        let newTier = currentTier;

        switch (currentTier) {
            case "Basic":
                if (totalReservations >= 5) {
                    newTier = "Premium";
                    progressMessage = "Congratulations! You've been upgraded to Premium.";
                } else {
                    const bookingsToNextTier = 5 - totalReservations;
                    progressMessage = `${bookingsToNextTier} more bookings to reach Premium.`;
                }
                break;
            case "Premium":
                if (totalReservations >= 15) {
                    newTier = "VIP";
                    progressMessage = "Congratulations! You've been upgraded to VIP.";
                } else {
                    const bookingsToNextTier = 15 - totalReservations;
                    progressMessage = `${bookingsToNextTier} more bookings to reach VIP.`;
                }
                break;
            case "VIP":
                progressMessage = "You're already at the highest tier: VIP!";
                break;
            default:
                progressMessage = "Membership tier information is unavailable.";
        }

        // Update membership tier if it has changed
        if (newTier !== currentTier) {
            await updateMembershipTier(userId, newTier);
            currentTier = newTier; // Update the current tier after the API call
        }

        // Display membership status
        const membershipStatusElement = document.getElementById("membershipStatus");
        membershipStatusElement.innerHTML = `
            <h3>Membership Tier: ${currentTier}</h3>
            <p>${progressMessage}</p>
            <p>Total Bookings: ${totalReservations}</p>
        `;
    } catch (error) {
        console.error("Error fetching account information:", error);
        alert("Failed to load account information. Please try again later.");
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
            user_id: parseInt(userId), // Ensure the user ID is included and is a number
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
            const response = await fetch(userApiUrl, {
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

async function updateMembershipTier(userId, newTier) {
    const membershipApiUrl = `http://localhost:8080/v1/account/user/${userId}`;
    try {
        const payload = { membership_tier: newTier }; // Only send membership_tier

        const response = await fetch(membershipApiUrl, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Error response from server:", errorData);
            throw new Error(errorData.message || "Failed to update membership tier.");
        }

        alert(`Your membership tier has been updated to ${newTier}!`);
    } catch (error) {
        console.error("Error updating membership tier:", error);
        alert(`Failed to update your membership tier: ${error.message}`);
    }
}
