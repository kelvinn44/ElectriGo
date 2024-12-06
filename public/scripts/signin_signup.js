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
document.getElementById("ButtonSignIn").addEventListener('click', event => {
  event.preventDefault();  // Prevent form default submission behavior

  // Collect input values from the form
  const email = document.getElementById("emailSignIn").value;
  const password = document.getElementById("passwordSignIn").value;

  // Create the payload to send to the server for login
  const payload = {
    Email: email,
    Password: password,
  };

  // Send POST request to log in
  fetch('http://localhost:8080/v1/account/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  .then(response => {
    // Expect JSON response from server
    if (!response.ok) {
      return response.json().then(errData => {
        console.error("Debugging: Response body for error:", errData);
        throw new Error(errData.message || 'Login failed. Please try again.');
      });
    }
    return response.json(); // Convert response to JSON
  })
  .then(data => {
    if (data.success) {
      alert(`Login successful! Welcome back!`);

      // Store user_id in local storage
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('user_id', data.user_id);
      localStorage.setItem('Email', email);
      
      // Redirect to account page
      window.location.href = "account.html";
    } else {
      alert("Login failed. Please check your email or password.");
      console.error("Server response indicated failure:", data);
    }
  })
  .catch(error => {
    console.error("Login error occurred:", error);
    alert(`Login failed: ${error.message}`);
  });
});

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
      alert(`Sign up successful! Welcome to ElectriGo, ${firstName}!`);

      // Clear form fields and store user data in local storage
      clearSignUpFields();
      storeUserData(email, `${firstName} ${lastName}`, password);
      localStorage.setItem('user_id', data.user_id); // Store user_id in local storage
      localStorage.setItem('Email', email);
      localStorage.setItem('isLoggedIn', 'true');

      // Redirect to account page
      window.location.href = "account.html";
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
