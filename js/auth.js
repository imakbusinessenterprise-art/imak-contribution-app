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

    let newUser = null;

    auth.createUserWithEmailAndPassword(email, password)
      .then(function (userCredential) {
        newUser = userCredential.user;
        const fullName = document.getElementById("fullName").value;
        const phone = document.getElementById("phone").value;

        return db.collection("users").doc(newUser.uid).set({
          fullName: fullName,
          email: email,
          phone: phone,
          role: "user",
          status: "active",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      })
      .then(function () {
        return newUser.sendEmailVerification();
      })
      .then(function () {
        message.textContent = "Account created! We've sent a verification link to your email — please verify before logging in.";
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
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    if (!user.emailVerified) {
      showVerifyReminder(user);
      return;
    }

    welcomeText.textContent = "Logged in as " + user.email;
  });
}

function showVerifyReminder(user) {
  const mainEl = document.querySelector("main.home-content");
  if (!mainEl) return;

  mainEl.innerHTML =
    "<h2>Verify Your Email</h2>" +
    "<p class='subtitle'>Please verify " + user.email + " before using your account. Check your inbox (and spam folder) for the link.</p>" +
    "<button id='resend-verify-btn' class='btn-primary'>Resend Verification Email</button>" +
    "<button id='verify-check-btn' class='btn-secondary'>I've Verified — Refresh</button>" +
    "<p id='verify-message' class='form-message'></p>" +
    "<button id='verify-logout-btn' class='btn-secondary logout-space'>Logout</button>";

  document.getElementById("resend-verify-btn").addEventListener("click", function () {
    const msg = document.getElementById("verify-message");
    user.sendEmailVerification().then(function () {
      msg.textContent = "Verification email sent again — check your inbox.";
      msg.style.color = "#0B4D2C";
    }).catch(function (error) {
      msg.textContent = error.message;
      msg.style.color = "#B00020";
    });
  });

  document.getElementById("verify-check-btn").addEventListener("click", function () {
    user.reload().then(function () {
      window.location.reload();
    });
  });

  document.getElementById("verify-logout-btn").addEventListener("click", function () {
    auth.signOut().then(function () {
      window.location.href = "login.html";
    });
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", function () {
    auth.signOut().then(function () {
      window.location.href = "login.html";
    });
  });
}
