// Mock login router for the prototype.
// username: "user"  -> redirect to user/home.html
// username: "admin" -> redirect to admin/dashboard.html
// anything else -> show error + shake + danger border

const form = document.getElementById('loginForm');
const inputUser = document.getElementById('email');     // your form labels it "Username / Email"
const inputPass = document.getElementById('password');
const errorEl = document.getElementById('loginError');

// convenience: remove error state
function clearError() {
  errorEl.style.display = 'none';
  errorEl.textContent = '';
  inputUser.classList.remove('input-danger', 'shake');
  inputPass.classList.remove('input-danger', 'shake');
  inputUser.setAttribute('aria-invalid', 'false');
  inputPass.setAttribute('aria-invalid', 'false');
}

// trigger shake (re-adding class to restart the animation)
function shakeFields() {
  [inputUser, inputPass].forEach(el => {
    el.classList.remove('shake'); // reset
    // force reflow so the animation runs again
    // eslint-disable-next-line no-unused-expressions
    el.offsetWidth;
    el.classList.add('shake');
  });
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.style.display = 'block';
  inputUser.classList.add('input-danger');
  inputPass.classList.add('input-danger');
  inputUser.setAttribute('aria-invalid', 'true');
  inputPass.setAttribute('aria-invalid', 'true');
  shakeFields();
}

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  clearError();

  const usernameRaw = (inputUser?.value || '').trim().toLowerCase();
  // (password is ignored for this mock)

  if (usernameRaw === 'user') {
    window.location.href = 'User/home.html';
    return;
  }
  if (usernameRaw === 'admin') {
    window.location.href = 'Admin/dashboard.html';
    return;
  }

  showError('Unknown username. For the demo, try "user" or "admin".');
});

// live typing removes error state
[inputUser, inputPass].forEach(el => {
  el?.addEventListener('input', clearError);
});
