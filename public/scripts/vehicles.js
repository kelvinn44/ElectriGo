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
                                    <label for="startDate${vehicle.vehicle_id}" class="form-label">Start Date</label>
                                    <input type="date" class="form-control" id="startDate${vehicle.vehicle_id}">
                                </div>
                                <div class="mb-3">
                                    <label for="endDate${vehicle.vehicle_id}" class="form-label">End Date</label>
                                    <input type="date" class="form-control" id="endDate${vehicle.vehicle_id}">
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

// Function to make a reservation
async function makeReservation(vehicleId) {
    const startDate = document.getElementById(`startDate${vehicleId}`).value;
    const endDate = document.getElementById(`endDate${vehicleId}`).value;

    if (!startDate || !endDate) {
        alert("Please select both start and end dates.");
        return;
    }

    const userId = localStorage.getItem('user_id');

    if (!userId) {
        alert("Please sign in to make a reservation.");
        return;
    }

    const reservationPayload = {
        user_id: userId,
        vehicle_id: vehicleId,
        start_time: startDate, // Updated to match the backend expected fields
        end_time: endDate,
    };

    try {
        const response = await fetch('http://localhost:8081/v1/bookings/reserve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(reservationPayload),
        });

        if (!response.ok) {
            throw new Error('Failed to make a reservation.');
        }

        alert('Reservation successful!');
    } catch (error) {
        console.error('Error making reservation:', error);
        alert('Failed to make a reservation. Please try again later.');
    }
}
