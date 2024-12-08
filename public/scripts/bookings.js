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

        if (!Array.isArray(reservations) || reservations.length === 0) {
            bookingsContainer.innerHTML = `<p class="text-muted">You have no reservations at the moment.</p>`;
            return;
        }

        reservations.sort((a, b) => b.reservation_id - a.reservation_id);

        reservations.forEach((reservation) => {
            const reservationCard = document.createElement('div');
            reservationCard.classList.add('col-md-4', 'mb-4');

            const isCompleted = reservation.status.toLowerCase() === 'completed';
            const isCancelled = reservation.status.toLowerCase() === 'cancelled';

            reservationCard.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Reservation ID: ${reservation.reservation_id}</h5>
                        <p class="card-text">
                            Vehicle: ${reservation.vehicle_name}<br>
                            Start: ${formatDateTimeToDDMMYYYY(reservation.start_time)}<br>
                            End: ${formatDateTimeToDDMMYYYY(reservation.end_time)}<br>
                            Status: ${reservation.status}<br>
                            Total Cost: $${reservation.total_cost.toFixed(2)}
                        </p>
                        ${
                            !isCompleted && !isCancelled
                                ? `
                                    <button class="btn btn-primary mb-2" onclick="openModifyInterface(
                                        ${reservation.reservation_id}, 
                                        '${reservation.start_time}', 
                                        '${reservation.end_time}'
                                    )">Modify</button>
                                    <button class="btn btn-danger" onclick="cancelReservation(${reservation.reservation_id})">Cancel</button>
                                `
                                : `
                                    <p class="text-secondary">${
                                        isCancelled
                                            ? "This reservation has been cancelled."
                                            : "This reservation is completed."
                                    }</p>
                                `
                        }
                    </div>
                </div>
            `;
            bookingsContainer.appendChild(reservationCard);
        });
    } catch (error) {
        console.error('Error fetching reservations:', error);
        document.getElementById('bookingsContainer').innerHTML = `<p class="text-danger">Failed to load reservations. Please try again later.</p>`;
    }
});

// Function to cancel a reservation
async function cancelReservation(reservationId) {
    if (!confirm(`Are you sure you want to cancel Reservation ID: ${reservationId}?`)) {
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

// Format date and time to dd/mm/yyyy hh:mm AM/PM
function formatDateTimeToDDMMYYYY(dateString) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-based
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const isPM = hours >= 12;
    const formattedHour = isPM ? hours - 12 || 12 : hours || 12;
    const ampm = isPM ? 'PM' : 'AM';
    return `${day}/${month}/${year}, ${formattedHour}:${minutes} ${ampm}`;
}

// Generate hour options for dropdowns
function generateHourOptions() {
    const hours = [];
    for (let i = 0; i < 12; i++) {
        const hour = i === 0 ? 12 : i;
        hours.push(`${hour}:00 AM`);
    }
    for (let i = 0; i < 12; i++) {
        const hour = i === 0 ? 12 : i;
        hours.push(`${hour}:00 PM`);
    }
    return hours.map((hour) => `<option value="${hour}">${hour}</option>`).join('');
}

// Open the modal interface for modification
function openModifyInterface(reservationId, currentStartTime, currentEndTime) {
    const modal = document.getElementById('modifyModal');
    const reservationIdDisplay = document.getElementById('reservationIdDisplay');
    const reservationIdInput = document.getElementById('reservationIdInput');
    const startDateInput = document.getElementById('startDateInput');
    const startTimeInput = document.getElementById('startTimeInput');
    const endDateInput = document.getElementById('endDateInput');
    const endTimeInput = document.getElementById('endTimeInput');

    if (!modal || !reservationIdInput || !startDateInput || !startTimeInput || !endDateInput || !endTimeInput) {
        console.error("Modal or input elements not found in the DOM.");
        return;
    }

    const startDate = new Date(currentStartTime);
    const endDate = new Date(currentEndTime);

    reservationIdDisplay.textContent = `Reservation ID: ${reservationId}`;
    startDateInput.value = startDate.toISOString().split('T')[0];
    endDateInput.value = endDate.toISOString().split('T')[0];
    startTimeInput.innerHTML = generateHourOptions();
    endTimeInput.innerHTML = generateHourOptions();
    startTimeInput.value = formatTimeForDropdown(startDate);
    endTimeInput.value = formatTimeForDropdown(endDate);

    modal.style.display = 'block';
}

// Format time for dropdown
function formatTimeForDropdown(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const isPM = hours >= 12;
    const formattedHour = isPM ? hours - 12 || 12 : hours || 12;
    const ampm = isPM ? 'PM' : 'AM';
    return `${formattedHour}:00 ${ampm}`;
}

// Close the modification modal
function closeModifyInterface() {
    const modal = document.getElementById('modifyModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Save the modified reservation
async function saveModifiedReservation() {
    const reservationId = document.getElementById('reservationIdInput').value;
    const startDate = document.getElementById('startDateInput').value;
    const startTime = document.getElementById('startTimeInput').value;
    const endDate = document.getElementById('endDateInput').value;
    const endTime = document.getElementById('endTimeInput').value;

    if (!startDate || !startTime || !endDate || !endTime) {
        alert("Please fill out all fields.");
        return;
    }

    const startDateTime = new Date(`${startDate} ${convertTo24Hour(startTime)}`).toISOString();
    const endDateTime = new Date(`${endDate} ${convertTo24Hour(endTime)}`).toISOString();

    const payload = {
        start_time: startDateTime,
        end_time: endDateTime,
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

        alert("Reservation modified successfully. \nExtra amount before modification will be refunded shortly. \nIf any extra amount is needed, it will be charged later on.");
        window.location.reload();
    } catch (error) {
        console.error('Error modifying reservation:', error);
        alert('Failed to modify reservation. Please try again later.');
    }
}

// Convert time from AM/PM to 24-hour format
function convertTo24Hour(time) {
    const [hour, modifier] = time.split(' ');
    let [hours, minutes] = hour.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
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
