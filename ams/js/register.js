// Populate advisor list from backend and handle registration submit
document.addEventListener('DOMContentLoaded', () => {
    initAdvisorDropdown();
    const form = document.getElementById('registrationForm');
    if (form) {
        form.addEventListener('submit', onRegisterSubmit);
    }
});

async function initAdvisorDropdown() {
    const selectEl = document.getElementById('advisorName');
    if (!selectEl) return;

    try {
        // Show loading option
        selectEl.innerHTML = '<option value="">Loading advisors...</option>';

        const res = await makeAPICall('?action=listAdvisors', {});
        if (!res || !res.success) throw new Error(res?.message || 'Failed to list advisors');

        const advisors = res.advisors || [];
        if (!advisors.length) {
            selectEl.innerHTML = '<option value="">No advisors found</option>';
            return;
        }

        // Build options with name shown and email kept in data attribute
        const frag = document.createDocumentFragment();
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select Academic Advisor';
        placeholder.disabled = true;
        placeholder.selected = true;
        frag.appendChild(placeholder);

        advisors.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.name; // keep name for compatibility with backend
            opt.textContent = a.name + (a.department ? ` (${a.department})` : '');
            opt.dataset.email = a.email;
            frag.appendChild(opt);
        });

        selectEl.innerHTML = '';
        selectEl.appendChild(frag);

        // Track selected advisor email in a hidden input (create if missing)
        let emailHidden = document.getElementById('advisorEmail');
        if (!emailHidden) {
            emailHidden = document.createElement('input');
            emailHidden.type = 'hidden';
            emailHidden.id = 'advisorEmail';
            emailHidden.name = 'advisorEmail';
            formAfter(selectEl, emailHidden);
        }

        selectEl.addEventListener('change', () => {
            const selected = selectEl.selectedOptions[0];
            emailHidden.value = selected?.dataset?.email || '';
        });
    } catch (err) {
        console.error('initAdvisorDropdown error:', err);
        selectEl.innerHTML = '<option value="">Failed to load advisors</option>';
    }
}

function formAfter(referenceNode, newNode) {
    if (referenceNode && referenceNode.parentNode) {
        referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
    }
}

async function onRegisterSubmit(e) {
    e.preventDefault();
    const messageEl = document.getElementById('message');
    const btn = e.submitter;
    if (btn) btn.disabled = true;

    const payload = {
        studentName: document.getElementById('studentName')?.value?.trim() || '',
        universityId: document.getElementById('universityId')?.value?.trim() || '',
        email: document.getElementById('email')?.value?.trim() || '',
        phone: document.getElementById('phone')?.value?.trim() || '',
        department: document.getElementById('department')?.value || '',
        advisorName: document.getElementById('advisorName')?.value || '',
        advisorEmail: document.getElementById('advisorEmail')?.value || '',
        gender: document.getElementById('gender')?.value || '',
        password: document.getElementById('password')?.value || ''
    };

    // Basic validation
    if (!payload.studentName || !payload.universityId || !payload.email || !payload.department || !payload.advisorName || !payload.gender || !payload.password) {
        showMessage(messageEl, 'Please fill in all required fields.', false);
        if (btn) btn.disabled = false;
        return;
    }

    // Validate password length
    if (payload.password.length < 6) {
        showMessage(messageEl, 'Password must be at least 6 characters long.', false);
        if (btn) btn.disabled = false;
        return;
    }

    try {
        const res = await makeAPICall('?action=register', payload);
        if (res.success) {
            showMessage(messageEl, 'Registration successful. You can now login.', true);
            setTimeout(() => window.location.href = 'login.html', 1200);
        } else {
            showMessage(messageEl, res.message || 'Registration failed.', false);
        }
    } catch (err) {
        console.error('Registration error:', err);
        showMessage(messageEl, 'Network or server error during registration.', false);
    } finally {
        if (btn) btn.disabled = false;
    }
}

function showMessage(el, text, success) {
    if (!el) return;
    el.style.display = 'block';
    el.textContent = text;
    el.className = 'message ' + (success ? 'success' : 'error');
}
