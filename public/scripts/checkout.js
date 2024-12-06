document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const reservationId = urlParams.get('reservation_id');
    const userId = localStorage.getItem('user_id');
    const checkoutApiUrl = `http://localhost:8081/v1/bookings/${reservationId}`;
    const membershipApiUrl = `http://localhost:8080/v1/account/user/${userId}`; // Membership level API
    const promotionsApiUrl = `http://localhost:8081/v1/bookings/promotions`; // Promotions API endpoint

    if (!reservationId) {
        alert("Invalid reservation. Redirecting to vehicles page.");
        window.location.href = "vehicles.html";
        return;
    }

    let reservation = null;
    let membershipTier = null;
    let baseCost = 0;
    let totalCost = 0;
    let discountPercentage = 0;
    let promoDiscountAmount = 0;
    let vehicleName = '';
    let hourlyRate = 0;

    let durationHours = 0;

    // Fetch reservation details
    try {
        const response = await fetch(checkoutApiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch reservation details.');
        }

        reservation = await response.json();
        vehicleName = reservation.vehicle_name || 'Unknown Vehicle';

        hourlyRate = reservation.hourly_rate || 0;

        if (hourlyRate === 0) {
            console.warn("Hourly rate is 0. There might be an issue with the server response or data retrieval.");
        }

        baseCost = reservation.total_cost || 0;

        // Calculate rental duration in hours
        const startTime = new Date(reservation.start_time);
        const endTime = new Date(reservation.end_time);
        durationHours = Math.ceil((endTime - startTime) / (1000 * 60 * 60));

        // Update cost summary with reservation data so far
        updateCostSummary(vehicleName, hourlyRate, membershipTier, durationHours, baseCost, 0, promoDiscountAmount, baseCost);

    } catch (error) {
        console.error('Error fetching reservation details:', error);
        alert('Failed to load reservation details. Please try again later.');
        return;
    }

    // Fetch membership details
    try {
        const response = await fetch(membershipApiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch membership details.');
        }

        const membershipData = await response.json();
        membershipTier = membershipData.membership_tier || 'Basic';

        // Determine discount percentage based on membership tier
        switch (membershipTier) {
            case 'Basic':
                discountPercentage = 0;
                break;
            case 'Premium':
                discountPercentage = 10; // 10% discount for Premium
                break;
            case 'VIP':
                discountPercentage = 20; // 20% discount for VIP
                break;
            default:
                discountPercentage = 0;
        }

        const membershipDiscount = (baseCost * discountPercentage) / 100;

        // Update total cost after membership discount
        totalCost = baseCost - membershipDiscount - promoDiscountAmount;

        // Update cost summary with membership details
        updateCostSummary(vehicleName, hourlyRate, membershipTier, durationHours, baseCost, membershipDiscount, promoDiscountAmount, totalCost);

    } catch (error) {
        console.error('Error fetching membership details:', error);
        alert('Failed to load membership details. Please try again later.');
        return;
    }

    document.getElementById('applyPromoButton').addEventListener('click', async () => {
        const promoCode = document.getElementById('promoCode').value.trim();
        if (!promoCode) {
            alert("Please enter a valid promo code.");
            return;
        }
    
        console.log(`Applying promo code: ${promoCode}`); // Log to verify the promo code
    
        try {
            const response = await fetch(`${promotionsApiUrl}?promo_code=${promoCode}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
    
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Promo code response error: ${errorText}`);
                throw new Error('Invalid or expired promo code.');
            }
    
            const promoData = await response.json();
            console.log('Promo data received:', promoData);
    
            const promoDiscountPercentage = promoData.discount_percentage;
    
            promoDiscountAmount = (baseCost * promoDiscountPercentage) / 100;
    
            // Update total cost with promo discount
            totalCost = baseCost - membershipDiscount - promoDiscountAmount;
    
            updateCostSummary(vehicleName, hourlyRate, membershipTier, durationHours, baseCost, membershipDiscount, promoDiscountAmount, totalCost);
            alert(`Promo code applied successfully! You saved ${promoDiscountPercentage}% on your booking.`);
        } catch (error) {
            console.error('Error applying promo code:', error);
            alert('Failed to apply promo code. Please try again later.');
        }
    });    

    // Handle Payment Method Selection
    document.getElementById('paymentMethod').addEventListener('change', (event) => {
        const paymentMethod = event.target.value;
        const paymentDetailsContainer = document.getElementById('paymentDetails');

        if (paymentMethod === 'PayNow') {
            paymentDetailsContainer.innerHTML = `
                <h4>PayNow QR Code</h4>
                <img src="images/paynow-qr-code.png" alt="PayNow QR Code" class="qr-code">
                <p>Scan the QR code with your banking app to complete the payment.</p>
            `;
        } else if (paymentMethod === 'BankTransfer') {
            paymentDetailsContainer.innerHTML = `
                <h4>Bank Transfer Details</h4>
                <p>Bank Name: DBS Bank</p>
                <p>Account Number: 123-4-567890</p>
                <p>Account Holder: ElectriGo Pte Ltd</p>
                <p>Branch Code: 123</p>
                <p>Please use your reservation ID as the reference number.</p>
            `;
        } else {
            paymentDetailsContainer.innerHTML = '';
        }
    });

    // Handle Payment
    document.getElementById('payButton').addEventListener('click', async () => {
        const paymentMethod = document.getElementById('paymentMethod').value;
        const reservationId = parseInt(urlParams.get('reservation_id')); // Convert reservation_id to integer
        const userId = parseInt(localStorage.getItem('user_id')); // Convert user_id to integer
    
        if (!paymentMethod) {
            alert('Please select a payment method.');
            return;
        }
    
        // Create the payment payload with correct data types
        const paymentPayload = {
            reservation_id: reservationId, // Send as an integer
            payment_method: paymentMethod,
            user_id: userId, // Send as an integer
        };
    
        console.log("Sending payment request with payload:", paymentPayload);
    
        try {
            const response = await fetch('http://localhost:8082/v1/payments/make', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(paymentPayload),
            });
    
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Payment failed: ${errorText}`);
            }
    
            alert('Payment successful! Your booking is confirmed.');
            window.location.href = `confirmation.html?reservation_id=${reservationId}`; // Redirect to a confirmation page
    
        } catch (error) {
            console.error('Error processing payment:', error);
            alert(`Failed to process payment. ${error.message}`);
        }
    });    

    function updateCostSummary(vehicleName, hourlyRate, membershipTier, durationHours, baseCost, membershipDiscount, promoDiscount, totalCost) {
        const costSummary = document.getElementById('costSummary');
        if (!costSummary) {
            console.error("Cost summary element not found. Please ensure it exists in your HTML.");
            return;
        }
        costSummary.innerHTML = `
            <h3>Cost Summary</h3>
            <p><strong>Vehicle:</strong> ${vehicleName || 'Unknown Vehicle'}</p>
            <p><strong>Hourly Rate:</strong> $${hourlyRate ? hourlyRate.toFixed(2) : '0.00'}</p>
            <p><strong>Membership Level:</strong> ${membershipTier || 'None'}</p>
            <p><strong>Rental Duration:</strong> ${durationHours || 0} hours</p>
            <hr>
            <p><strong>Base Cost:</strong> $${baseCost ? baseCost.toFixed(2) : '0.00'}</p>
            <p><strong>Membership Discount (${discountPercentage}%):</strong> -$${membershipDiscount ? membershipDiscount.toFixed(2) : '0.00'}</p>
            <p><strong>Promotional Discount:</strong> -$${promoDiscount ? promoDiscount.toFixed(2) : '0.00'}</p>
            <p><strong>Total Cost:</strong> $${totalCost ? totalCost.toFixed(2) : '0.00'}</p>
        `;
    }
});
