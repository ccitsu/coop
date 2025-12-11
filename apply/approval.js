// Global State for Admin Dashboard
let currentAdmin = null;
let allApplications = [];
let currentFilter = 'all';

// Configuration - Replace with your actual Google Apps Script Web App URL
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzA05gP5hEzNLQV6Z8wnkg-0t7wlymFSui8JhykclAcgfUAqEEOi1ZuXJKUCB5d-SId5A/exec';

// ==================== Admin Authentication ====================

function handleAdminLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    
    // Call Google Apps Script to authenticate admin
    fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'adminLogin',
            email: email,
            password: password
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Admin login response:', data);
        if (data.success) {
            currentAdmin = data.admin;
            localStorage.setItem('currentAdmin', JSON.stringify(data.admin));
            goToApprovalDashboard();
        } else {
            showError(data.message || 'Invalid admin credentials');
        }
    })
    .catch(error => {
        console.error('Admin login error:', error);
        showError('Login failed. Please try again.');
    });
}

function handleAdminLogout() {
    currentAdmin = null;
    localStorage.removeItem('currentAdmin');
    allApplications = [];
    goToAdminLogin();
}

// ==================== Navigation Functions ====================

function goToAdminLogin() {
    document.getElementById('adminLoginPage').classList.add('active');
    document.getElementById('approvalDashboardPage').classList.remove('active');
    
    document.getElementById('adminEmail').value = '';
    document.getElementById('adminPassword').value = '';
}

function goToApprovalDashboard() {
    document.getElementById('adminLoginPage').classList.remove('active');
    document.getElementById('approvalDashboardPage').classList.add('active');
    
    document.getElementById('adminName').textContent = currentAdmin.name;
    switchApprovalView('pending');
    loadAllApplications();
}

function switchApprovalView(view) {
    // Hide all views
    document.querySelectorAll('.dashboard-view').forEach(v => {
        v.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected view
    if (view === 'pending') {
        document.getElementById('pendingView').classList.add('active');
        document.querySelectorAll('.nav-button')[0].classList.add('active');
        displayPendingApplications();
    } else if (view === 'all') {
        document.getElementById('allView').classList.add('active');
        document.querySelectorAll('.nav-button')[1].classList.add('active');
        displayAllApplications();
    } else if (view === 'search') {
        document.getElementById('searchView').classList.add('active');
        document.querySelectorAll('.nav-button')[2].classList.add('active');
    }
}

// ==================== Application Loading ====================

function loadAllApplications() {
    fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'getPendingApplications'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            allApplications = data.applications;
            displayPendingApplications();
            displayAllApplications();
        } else {
            showError(data.message || 'Failed to load applications');
        }
    })
    .catch(error => {
        console.error('Error loading applications:', error);
        showError('Failed to load applications');
    });
}

function displayPendingApplications() {
    const listContainer = document.getElementById('pendingApplicationsList');
    const pending = allApplications.filter(app => app.status === 'WAITING FOR APPROVAL');
    
    if (pending.length === 0) {
        listContainer.innerHTML = '<p>No pending applications</p>';
        return;
    }
    
    listContainer.innerHTML = '';
    pending.forEach(app => {
        listContainer.appendChild(createApplicationCard(app, true));
    });
}

function displayAllApplications() {
    const listContainer = document.getElementById('allApplicationsList');
    
    if (allApplications.length === 0) {
        listContainer.innerHTML = '<p>No applications found</p>';
        return;
    }
    
    listContainer.innerHTML = '';
    allApplications.forEach(app => {
        listContainer.appendChild(createApplicationCard(app, false));
    });
}

function filterApplications(status) {
    // Update active filter button
    document.querySelectorAll('#pendingView .btn-filter').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    const listContainer = document.getElementById('pendingApplicationsList');
    
    let filtered;
    if (status === 'all') {
        filtered = allApplications.filter(app => app.status === 'WAITING FOR APPROVAL');
    } else {
        filtered = allApplications.filter(app => app.status === status);
    }
    
    if (filtered.length === 0) {
        listContainer.innerHTML = '<p>No applications found</p>';
        return;
    }
    
    listContainer.innerHTML = '';
    filtered.forEach(app => {
        listContainer.appendChild(createApplicationCard(app, true));
    });
}

function filterAllApplications(status) {
    // Update active filter button
    document.querySelectorAll('#allView .btn-filter').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    const listContainer = document.getElementById('allApplicationsList');
    
    const filtered = status === 'all' ? allApplications : allApplications.filter(app => app.status === status);
    
    if (filtered.length === 0) {
        listContainer.innerHTML = '<p>No applications found</p>';
        return;
    }
    
    listContainer.innerHTML = '';
    filtered.forEach(app => {
        listContainer.appendChild(createApplicationCard(app, false));
    });
}

// ==================== Search Function ====================

function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.trim();
    
    if (!searchTerm) {
        showError('Please enter a student ID or email');
        return;
    }
    
    fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'searchApplications',
            searchTerm: searchTerm
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displaySearchResults(data.applications);
        } else {
            showError(data.message || 'Search failed');
        }
    })
    .catch(error => {
        console.error('Search error:', error);
        showError('Search failed');
    });
}

function displaySearchResults(applications) {
    const listContainer = document.getElementById('searchResultsList');
    
    if (applications.length === 0) {
        listContainer.innerHTML = '<p>No applications found for this student</p>';
        return;
    }
    
    listContainer.innerHTML = `<p class="search-info">Found ${applications.length} application(s)</p>`;
    applications.forEach(app => {
        listContainer.appendChild(createApplicationCard(app, false));
    });
}

// ==================== Application Card Creation ====================

function createApplicationCard(app, showActions) {
    const card = document.createElement('div');
    card.className = 'application-card';
    
    const statusClass = app.status.replace(/\s+/g, '-').toLowerCase();
    
    let pdfLink = '';
    if (app.pdfLink && app.pdfLink.startsWith('http')) {
        pdfLink = `<p><strong>PDF:</strong> <a href="${app.pdfLink}" target="_blank" class="btn-link">View PDF</a></p>`;
    }
    
    let approvalInfo = '';
    if (app.approvalDate) {
        approvalInfo = `<p><strong>Decision Date:</strong> ${new Date(app.approvalDate).toLocaleDateString()}</p>`;
    }
    
    let actionsHtml = '';
    if (showActions && app.status === 'WAITING FOR APPROVAL') {
        actionsHtml = `
            <div class="card-actions">
                <button class="btn btn-approve" onclick="approveApplication('${app.submissionId}')">Approve</button>
                <button class="btn btn-reject" onclick="rejectApplication('${app.submissionId}')">Reject</button>
            </div>
        `;
    }
    
    card.innerHTML = `
        <div class="card-header">
            <h3>${app.studentName}</h3>
            <span class="submission-status status-${statusClass}">${app.status}</span>
        </div>
        <div class="card-body">
            <p><strong>Student ID:</strong> ${app.studentId}</p>
            <p><strong>Email:</strong> ${app.studentEmail}</p>
            <p><strong>Phone:</strong> ${app.studentPhone}</p>
            <p><strong>Department:</strong> ${app.department}</p>
            <p><strong>Company:</strong> ${app.companyName}</p>
            <p><strong>Submitted:</strong> ${new Date(app.submittedDate).toLocaleDateString()}</p>
            ${approvalInfo}
            ${pdfLink}
        </div>
        ${actionsHtml}
    `;
    
    return card;
}

// ==================== Approval/Rejection Functions ====================

function approveApplication(submissionId) {
    if (!confirm('Are you sure you want to approve this application?')) {
        return;
    }
    
    showLoading('Generating PDF and sending emails...');
    
    fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'approveApplication',
            submissionId: submissionId,
            approverEmail: currentAdmin.email
        })
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        if (data.success) {
            showSuccess('Application approved successfully!');
            loadAllApplications();
        } else {
            showError(data.message || 'Approval failed');
        }
    })
    .catch(error => {
        hideLoading();
        console.error('Approval error:', error);
        showError('Approval failed');
    });
}

function rejectApplication(submissionId) {
    const reason = prompt('Please enter a reason for rejection:');
    
    if (reason === null) {
        return; // User cancelled
    }
    
    if (!reason.trim()) {
        showError('Please provide a reason for rejection');
        return;
    }
    
    showLoading('Sending rejection emails...');
    
    fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'rejectApplication',
            submissionId: submissionId,
            approverEmail: currentAdmin.email,
            reason: reason
        })
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        if (data.success) {
            showSuccess('Application rejected');
            loadAllApplications();
        } else {
            showError(data.message || 'Rejection failed');
        }
    })
    .catch(error => {
        hideLoading();
        console.error('Rejection error:', error);
        showError('Rejection failed');
    });
}

// ==================== Modal Functions ====================

function closeModal() {
    document.getElementById('applicationModal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('applicationModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// ==================== Utility Functions ====================

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    
    const container = document.querySelector('.dashboard-content') || document.querySelector('.form-container');
    if (container) {
        container.insertBefore(errorDiv, container.firstChild);
        setTimeout(() => errorDiv.remove(), 5000);
    }
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.textContent = message;
    
    const container = document.querySelector('.dashboard-content') || document.querySelector('.form-container');
    if (container) {
        container.insertBefore(successDiv, container.firstChild);
        setTimeout(() => successDiv.remove(), 5000);
    }
}

function showLoading(message) {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingOverlay';
    loadingDiv.className = 'loading-overlay';
    loadingDiv.innerHTML = `
        <div class="loading-content">
            <div class="spinner"></div>
            <p>${message || 'Processing...'}</p>
        </div>
    `;
    document.body.appendChild(loadingDiv);
}

function hideLoading() {
    const loadingDiv = document.getElementById('loadingOverlay');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// ==================== Initialize ====================

// Check if admin is already logged in
window.addEventListener('DOMContentLoaded', () => {
    const savedAdmin = localStorage.getItem('currentAdmin');
    if (savedAdmin) {
        currentAdmin = JSON.parse(savedAdmin);
        goToApprovalDashboard();
    }
});
