// Global State
let currentUser = null;
let submissions = [];

// Configuration - Replace with your actual Google Apps Script Web App URL
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzA05gP5hEzNLQV6Z8wnkg-0t7wlymFSui8JhykclAcgfUAqEEOi1ZuXJKUCB5d-SId5A/exec';

// ==================== Authentication Functions ====================

function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + 'Form').classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
}

function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Call Google Apps Script to authenticate
    fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'login',
            email: email,
            password: password
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Login response:', data);
        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            submissions = data.submissions || [];
            goToDashboard();
        } else {
            console.error('Login failed:', data);
            if (data.debug) {
                console.error('Debug info:', data.debug);
                showError(data.message + ' (Check browser console for debug info)');
            } else {
                showError(data.message || 'Invalid email or password');
            }
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        showError('Login failed. Please try again.');
    });
}

function handleRegister(event) {
    event.preventDefault();
    
    const studentId = document.getElementById('regStudentId').value;
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const department = document.getElementById('regDepartment').value;
    const phone = document.getElementById('regPhone').value;
    const gender = document.getElementById('regGender').value;
    const password = document.getElementById('regPassword').value;
    
    // Call Google Apps Script to register
    fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'register',
            studentId: studentId,
            name: name,
            email: email,
            department: department,
            phone: phone,
            gender: gender,
            password: password
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccess('Registration successful! Please login.');
            switchTab('login');
            document.getElementById('loginEmail').value = email;
            document.getElementById('loginPassword').value = '';
        } else {
            showError(data.message || 'Registration failed');
        }
    })
    .catch(error => {
        console.error('Registration error:', error);
        showError('Registration failed. Please try again.');
    });
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    submissions = [];
    goToLogin();
}

// ==================== Navigation Functions ====================

function goToLogin() {
    document.getElementById('loginPage').classList.add('active');
    document.getElementById('dashboardPage').classList.remove('active');
    
    // Clear form fields
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    switchTab('login');
}

function goToDashboard() {
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('dashboardPage').classList.add('active');
    
    document.getElementById('studentName').textContent = currentUser.name;
    switchDashboardView('history');
    loadSubmissionHistory();
    loadApplicationForm();
}

function switchDashboardView(view) {
    // Hide all views
    document.querySelectorAll('.dashboard-view').forEach(v => {
        v.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected view
    if (view === 'history') {
        document.getElementById('historyView').classList.add('active');
        document.querySelector('.nav-button:nth-child(1)').classList.add('active');
    } else if (view === 'newForm') {
        document.getElementById('newFormView').classList.add('active');
        document.querySelector('.nav-button:nth-child(2)').classList.add('active');
    }
}

// ==================== Form Functions ====================

function loadApplicationForm() {
    // Call Google Apps Script to get form fields
    fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'getFormFields'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            renderFormFields(data.fields);
        }
    })
    .catch(error => console.error('Error loading form fields:', error));
}

function renderFormFields(fields) {
    const formFieldsDiv = document.getElementById('formFields');
    formFieldsDiv.innerHTML = '';
    
    fields.forEach(field => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = field.label;
        label.htmlFor = field.name;
        
        let input;
        
        if (field.type === 'textarea') {
            input = document.createElement('textarea');
        } else if (field.type === 'date') {
            input = document.createElement('input');
            input.type = 'date';
        } else if (field.type === 'select') {
            input = document.createElement('select');
            field.options.forEach(option => {
                const opt = document.createElement('option');
                opt.value = option;
                opt.textContent = option;
                input.appendChild(opt);
            });
        } else {
            input = document.createElement('input');
            input.type = field.type || 'text';
        }
        
        input.id = field.name;
        input.name = field.name;
        input.required = field.required !== false;
        
        group.appendChild(label);
        group.appendChild(input);
        formFieldsDiv.appendChild(group);
    });
}

function handleFormSubmit(event) {
    event.preventDefault();
    
    // Collect form data
    const formData = new FormData(document.getElementById('applicationForm'));
    const data = Object.fromEntries(formData);
    
    console.log('Form submission started');
    console.log('Current user:', currentUser);
    console.log('Form data:', data);
    
    // Call Google Apps Script to process form and send email
    fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'submitApplication',
            userId: currentUser.id,
            studentEmail: currentUser.email,
            formData: data
        })
    })
    .then(response => {
        console.log('Response received:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Response data:', data);
        if (data.success) {
            showSuccess('Application submitted successfully! Check your email for the permission letter.');
            document.getElementById('applicationForm').reset();
            submissions.push(data.submission);
            switchDashboardView('history');
            loadSubmissionHistory();
        } else {
            showError(data.message || 'Submission failed');
        }
    })
    .catch(error => {
        console.error('Submission error:', error);
        showError('Submission failed: ' + error.message);
    });
}

function loadSubmissionHistory() {
    const submissionList = document.getElementById('submissionList');
    
    if (submissions.length === 0) {
        submissionList.innerHTML = '<p>No submissions yet</p>';
        return;
    }
    
    submissionList.innerHTML = '';
    
    submissions.forEach(submission => {
        const item = document.createElement('div');
        item.className = 'submission-item';
        
        // Determine status display and PDF link visibility
        const status = submission.status || 'Pending';
        const statusClass = status.replace(/\s+/g, '-').toLowerCase();
        
        // Only show PDF link if status is APPROVED and PDF link exists
        let pdfLinkHtml = '';
        if (status === 'APPROVED' && submission.pdfLink && submission.pdfLink.startsWith('http')) {
            pdfLinkHtml = `<p><strong>PDF:</strong> <a href="${submission.pdfLink}" target="_blank" rel="noopener" class="btn-download">Download Permission Letter</a></p>`;
        } else if (status === 'WAITING FOR APPROVAL') {
            pdfLinkHtml = `<p class="info-message">Your application is awaiting approval from the Head of Unit.</p>`;
        } else if (status === 'REJECTED') {
            pdfLinkHtml = `<p class="error-message">Your application was not approved. Please contact the academic department.</p>`;
        }

        item.innerHTML = `
            <h3>${submission.companyName || 'Field Training Application'}</h3>
            <p><strong>Submitted:</strong> ${new Date(submission.submittedDate).toLocaleDateString()}</p>
            <p><strong>Status:</strong> <span class="submission-status status-${statusClass}">${status}</span></p>
            ${pdfLinkHtml}
        `;
        
        submissionList.appendChild(item);
    });
}

// ==================== Utility Functions ====================

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    
    const formContainer = document.querySelector('.form-container') || document.querySelector('.dashboard-content');
    if (formContainer) {
        formContainer.insertBefore(errorDiv, formContainer.firstChild);
        setTimeout(() => errorDiv.remove(), 5000);
    }
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.textContent = message;
    
    const formContainer = document.querySelector('.form-container') || document.querySelector('.dashboard-content');
    if (formContainer) {
        formContainer.insertBefore(successDiv, formContainer.firstChild);
        setTimeout(() => successDiv.remove(), 5000);
    }
}

// ==================== Initialize ====================

// Check if user is already logged in
window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        goToDashboard();
    }
});
