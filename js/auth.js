// Handles real Firebase registration and login

const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");

if (registerForm) {
  registerForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const message = document.getElementById("register-message");

    message.textContent = "Creating your account...";
    message.style.color = "#555";

    auth.createUserWithEmailAndPassword(email, password)
      .then(function (userCredential) {
        const fullName = document.getElementById("fullName").value;
        const phone = document.getElementById("phone").value;

        return db.collection("users").doc(userCredential.user.uid).set({
          fullName: fullName,
          email: email,
          phone: phone,
          role: "user",
          status: "active",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      })
      .then(function () {
        message.textContent = "Account created! You can now log in.";
        message.style.color = "#0B4D2C";
      })
      .catch(function (error) {
        message.textContent = error.message;
        message.style.color = "#B00020";
      });
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const message = document.getElementById("login-message");

    message.textContent = "Logging in...";
    message.style.color = "#555";

    auth.signInWithEmailAndPassword(email, password)
      .then(function () {
        message.textContent = "Login successful!";
        message.style.color = "#0B4D2C";
        window.location.href = "dashboard.html";
      })
      .catch(function (error) {
        message.textContent = error.message;
        message.style.color = "#B00020";
      });
  });
}

// Protects dashboard.html — sends non-logged-in users to login.html
const welcomeText = document.getElementById("welcome-text");
const logoutBtn = document.getElementById("logout-btn");

if (welcomeText) {
  auth.onAuthStateChanged(function (user) {
    if (user) {
      welcomeText.textContent = "Logged in as " + user.email;
    } else {
      window.location.href = "login.html";
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", function () {
    auth.signOut().then(function () {
      window.location.href = "login.html";
    });
  });
          }
