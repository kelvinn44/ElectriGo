// Select necessary DOM elements
const signInButton = document.getElementById("signIn");
const signUpButton = document.getElementById("signUp");
const container = document.getElementById("container");
const verificationCodeInputSignUp = document.getElementById("verificationCodeSignUp");
const emailVerificationButtonSignUp = document.getElementById("emailVerificationButtonSignUp");

// Store verification code for comparison
let verificationCode = ""; // Globally available for storing the code

// Toggle between sign-in and sign-up forms
signInButton.addEventListener("click", () => container.classList.remove("right-panel-active"));
signUpButton.addEventListener("click", () => container.classList.add("right-panel-active"));

// Handle form submission to prevent default behavior and trigger the button click
document.getElementById("signInForm").addEventListener('submit', event => {
  event.preventDefault();
  document.getElementById("ButtonSignIn").click();
});

document.getElementById("signUpForm").addEventListener('submit', event => {
  event.preventDefault();
  document.getElementById("Button-SignUp").click();
});

// Handle Sign In Form Submit
document.getElementById("ButtonSignIn").addEventListener('click', async event => {
  event.preventDefault(); // Prevent form default submission behavior

  // Collect input values from the form
  const email = document.getElementById("emailSignIn").value.trim();
  const password = document.getElementById("passwordSignIn").value.trim();

  // Validate input fields
  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  // Create the payload to send to the server for login
  const payload = {
    Email: email,
    Password: password,
  };

  try {
    // Send POST request to log in
    const response = await fetch('http://localhost:8080/v1/account/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Check if the response is not OK
    if (!response.ok) {
      const errorData = await response.json(); // Attempt to parse JSON error message
      if (response.status === 401) {
        throw new Error(errorData.message || "Invalid email or password. Please try again.");
      } else {
        throw new Error(errorData.message || "An error occurred during login. Please try again.");
      }
    }

    // Parse successful response JSON
    const data = await response.json();

    // Handle successful login
    if (data.success) {
      alert("Login successful! Welcome back!");

      // Store user_id and other data in local storage
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('user_id', data.user_id);
      localStorage.setItem('Email', email);

       // Fetch user profile data and ensure fields are populated
       const userId = data.user_id;
       await fetchUserProfile(userId);

      // Redirect to account page
      window.location.href = "account.html";
    } else {
      alert("Login failed. Please check your email or password.");
    }
  } catch (error) {
    // Handle errors (both network and backend errors)
    console.error("Login error occurred:", error);
    alert(error.message); // Display meaningful error message to the user
  }
});

async function fetchUserProfile(userId) {
  const apiUrl = `http://localhost:8080/v1/account/user/${userId}`;
  try {
    const response = await fetch(apiUrl, { method: "GET", headers: { "Content-Type": "application/json" } });
    if (!response.ok) throw new Error("Failed to fetch user profile.");

    const userData = await response.json();

    // Check if required fields are populated
    if (!userData.first_name || !userData.last_name || !userData.date_of_birth || !userData.address) {
      alert("Your profile is incomplete. Please update your profile.");
      window.location.href = "profile_update.html"; // Redirect to profile update page
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    alert("Failed to load your profile. Please try again later.");
  }
}

// Handle Email Verification for Sign Up
emailVerificationButtonSignUp.addEventListener("click", async () => {
  const email = document.getElementById("emailSignUp").value;

  if (!email) {
      alert("Please enter your email address before requesting a verification code.");
      return;
  }

  // Disable the button to prevent multiple requests and indicate loading
  emailVerificationButtonSignUp.disabled = true;
  emailVerificationButtonSignUp.innerText = "Sending...";

  try {
      const response = await fetch("http://localhost:8080/v1/account/requestVerificationCode", {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
          },
          body: JSON.stringify({ Email: email }),
      });

      const data = await response.json();

      if (data.success) {
          verificationCode = data.code || ""; // Assign the returned code if it exists
          alert("A verification code has been sent to your email address.");

          // Enable the verification code input field
          verificationCodeInputSignUp.disabled = false;
          // Enable Sign Up button
          document.getElementById("Button-SignUp").disabled = false;
      } else {
          alert("Failed to send verification code. Please try again.");
      }
  } catch (error) {
      console.error("Error sending verification code:", error);
      alert("An error occurred. Please try again.");
  } finally {
      // Re-enable button and reset text
      emailVerificationButtonSignUp.disabled = false;
      emailVerificationButtonSignUp.innerText = "Verify";
  }
});

// Handle Sign Up Form Submit after Verification
document.getElementById("Button-SignUp").addEventListener('click', event => {
  event.preventDefault();  // Prevent form default submission behavior

  // Collect input values from the form
  const firstName = document.getElementById("firstNameSignUp").value;
  const lastName = document.getElementById("lastNameSignUp").value;
  const email = document.getElementById("emailSignUp").value;
  const password = document.getElementById("passwordSignUp").value;
  const address = document.getElementById("addressSignUp").value;
  const dateOfBirth = document.getElementById("dateOfBirthSignUp").value;
  const enteredCode = verificationCodeInputSignUp.value;

  // Check if verification code entered matches the one stored
  if (enteredCode !== verificationCode) {
    alert("Invalid verification code. Please try again.");
    console.error("Verification failed: Entered code does not match stored code.");
    return;
  }

  // Check if any of the fields are empty
  if (!firstName || !lastName || !email || !password || !address || !dateOfBirth) {
    alert("Please fill out all fields.");
    console.error("Form validation failed: Missing required fields.");
    return;
  }

  // Create the payload to send to the server
  const payload = {
    FirstName: firstName,
    LastName: lastName,
    Email: email,
    PasswordHash: password,  // Send the password as PasswordHash to match backend expectations
    Address: address,
    DateOfBirth: dateOfBirth,
    Code: enteredCode  // Add verification code to the payload
  };

  // Send POST request to register
  fetch('http://localhost:8080/v1/account/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(errData => {
        console.log("Debugging: Response body for error:", errData);
        throw new Error(errData.message || 'Failed to register. Please try again.');
      });
    }
    return response.json();  // Convert to JSON
  })
  .then(data => {
    if (data.success) {
      alert(`Sign up successful! Welcome to ElectriGo, ${firstName}! You can now log in.`);

      // Clear form fields
      clearSignUpFields();

      // Redirect to login page
      window.location.href = "signin_signup.html";
    } else {
      alert("Sign up failed. Please try again.");
      console.error("Server response indicated failure:", data);
    }
  })
  .catch(error => {
    console.error("Sign-up error occurred:", error);
    alert(`Sign up failed: ${error.message}`);
  });
});

// Define the clearSignUpFields function to clear the sign-up form fields
function clearSignUpFields() {
  document.getElementById("firstNameSignUp").value = "";
  document.getElementById("lastNameSignUp").value = "";
  document.getElementById("emailSignUp").value = "";
  document.getElementById("passwordSignUp").value = "";
  document.getElementById("addressSignUp").value = "";
  document.getElementById("dateOfBirthSignUp").value = "";
  document.getElementById("verificationCodeSignUp").value = "";
}

// Helper function to store user data in local storage
function storeUserData(email, name, password) {
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('Email', email);
  localStorage.setItem('Name', name);
  localStorage.setItem('Password', password);
}
