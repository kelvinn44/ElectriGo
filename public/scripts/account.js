document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('user_id'); // Retrieve user_id from localStorage
    const userApiUrl = `http://localhost:8080/v1/account/user/${userId}`;
    const invoicesApiUrl = `http://localhost:8082/v1/invoices/user/${userId}`;
    const bookingsApiUrl = `http://localhost:8082/v1/bookings/user/${userId}`; // Updated URL for bookings

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

        // Fetch the number of invoices (bookings) for the user
        const invoicesResponse = await fetch(invoicesApiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        let numberOfBookings = 0;
        if (invoicesResponse.ok) {
            const invoices = await invoicesResponse.json();

            // Ensure invoices is not null or undefined
            if (Array.isArray(invoices)) {
                // Count non-canceled bookings (already filtered by backend)
                numberOfBookings = invoices.length;
            } else {
                console.warn('Invoices response is not an array. Defaulting to 0 bookings.');
            }
        } else if (invoicesResponse.status === 404) {
            // Handle no rental history
            numberOfBookings = 0;
        } else {
            throw new Error('Failed to fetch user invoices.');
        }

        // Determine membership tier and progress to the next tier
        let currentTier = userData.membership_tier || 'Basic';
        let progressMessage = '';
        let newTier = currentTier;

        switch (currentTier) {
            case 'Basic':
                if (numberOfBookings >= 5) {
                    newTier = 'Premium';
                    progressMessage = 'Congratulations! You have reached Premium tier.';
                } else {
                    const bookingsToPremium = 5 - numberOfBookings;
                    progressMessage = `${bookingsToPremium} more booking(s) to reach Premium.`;
                }
                break;
            case 'Premium':
                if (numberOfBookings >= 15) {
                    newTier = 'VIP';
                    progressMessage = 'Congratulations! You have reached VIP tier.';
                } else {
                    const bookingsToVIP = 15 - numberOfBookings;
                    progressMessage = `${bookingsToVIP} more booking(s) to reach VIP.`;
                }
                break;
            case 'VIP':
                progressMessage = 'You are already at the highest tier: VIP!';
                break;
            default:
                progressMessage = 'Membership tier information is not available.';
        }

        // If the tier needs to be updated, make an API call
        if (newTier !== currentTier) {
            await updateMembershipTier(userId, newTier);
            currentTier = newTier; // Update the current tier after API call
        }

        // Display membership status
        const membershipStatusElement = document.getElementById('membershipStatus');
        if (membershipStatusElement) {
            membershipStatusElement.innerHTML = `
                <h3>Membership Tier: ${currentTier}</h3>
                <p>${progressMessage}</p>
                <p>Total Bookings: ${numberOfBookings}</p>
            `;
        } else {
            console.error('Error: membershipStatus element not found.');
        }

    } catch (error) {
        console.error('Error fetching user data or membership status:', error);
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

// Function to update membership tier in the database
// async function updateMembershipTier(userId, newTier) {
//     const apiUrl = `http://localhost:8080/v1/account/user/${userId}`;
//     try {
//         const payload = { membership_tier: newTier };
//         console.log("Payload sent to API:", payload); // Debugging log
//         const response = await fetch(apiUrl, {
//             method: 'PUT',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify(payload),
//         });

//         if (!response.ok) {
//             const errorData = await response.json(); // Capture error response from the server
//             console.error("Error response from server:", errorData);
//             throw new Error('Failed to update membership tier.');
//         }

//         console.log(`Successfully updated membership tier to ${newTier}`);
//     } catch (error) {
//         console.error('Error updating membership tier:', error);
//         alert('Failed to update your membership tier. Please try again later.');
//     }
// }

async function updateMembershipTier(userId, newTier) {
    const apiUrl = `http://localhost:8080/v1/account/user/${userId}`;
  
    try {
      const response = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ membership_tier: newTier }), // Only send the tier
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response from server:", errorData);
        throw new Error(errorData.message || "Failed to update membership tier.");
      }
  
      console.log(`Successfully updated membership tier to ${newTier}`);
      alert(`Your membership tier has been updated to ${newTier}!`);
    } catch (error) {
      console.error("Error updating membership tier:", error);
      alert(`Failed to update your membership tier: ${error.message}`);
    }
  }
  


async function parseErrorResponse(response) {
    try {
        // Try to parse as JSON
        const errorData = await response.json();
        return errorData.error || errorData.message || null;
    } catch {
        try {
            // Fallback to plain text
            const errorText = await response.text();
            return errorText;
        } catch {
            // If all fails, return null
            return null;
        }
    }
}

