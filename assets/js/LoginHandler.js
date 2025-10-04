// Mock login router for the prototype.
// username: "user"  -> redirect to user/home.html
// username: "admin" -> redirect to admin/dashboard.html
// anything else -> show error + shake + danger border

document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('loginForm');
  const inputUser = document.getElementById('email');     // your form labels it "Username / Email"
  const inputPass = document.getElementById('password');
  const errorEl = document.getElementById('loginError');

  // convenience: remove error state
  function clearError() {
    if (errorEl) {
      errorEl.style.display = 'none';
      errorEl.textContent = '';
    }
    if (inputUser) {
      inputUser.classList.remove('input-danger', 'shake');
      inputUser.setAttribute('aria-invalid', 'false');
    }
    if (inputPass) {
      inputPass.classList.remove('input-danger', 'shake');
      inputPass.setAttribute('aria-invalid', 'false');
    }
  }

  // trigger shake (re-adding class to restart the animation)
  function shakeFields() {
    [inputUser, inputPass].forEach(el => {
      if (el) {
        el.classList.remove('shake'); // reset
        // force reflow so the animation runs again
        el.offsetWidth;
        el.classList.add('shake');
      }
    });
  }

  function showError(msg) {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    }
    if (inputUser) {
      inputUser.classList.add('input-danger');
      inputUser.setAttribute('aria-invalid', 'true');
    }
    if (inputPass) {
      inputPass.classList.add('input-danger');
      inputPass.setAttribute('aria-invalid', 'true');
    }
    shakeFields();
  }

  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      clearError();

      const usernameRaw = (inputUser && inputUser.value || '').trim().toLowerCase();
      // (password is ignored for this mock)

      if (usernameRaw === 'user') {
        window.location.href = '/User/home';
        return;
      }
      if (usernameRaw === 'admin') {
        window.location.href = '/Admin/dashboard';
        return;
      }

      showError('Unknown username. For the demo, try "user" or "admin".');
    });
  }

  // live typing removes error state
  [inputUser, inputPass].forEach(el => {
    if (el) {
      el.addEventListener('input', clearError);
    }
  });
});
