document.addEventListener('DOMContentLoaded', async function() {
    console.log('Dashboard loaded');
    
    // Check authentication
    const user = checkAuth();
    if (!user) {
        console.log('No user found, redirecting to login');
        return;
    }
    
    console.log('User authenticated:', user);
    
    // Display user information
    try {
        document.getElementById('studentName').textContent = user.studentName;
        document.getElementById('universityId').textContent = user.universityId;
        document.getElementById('email').textContent = user.email;
        document.getElementById('department').textContent = user.department;
        document.getElementById('advisorName').textContent = user.advisorName;
    } catch (e) {
        console.error('Error displaying user info:', e);
    }
    
    // Load applications
    console.log('Starting to load applications...');
    await loadApplications();
});

async function loadApplications() {
    console.log('loadApplications function called');
    const container = document.getElementById('applicationsContainer');
    
    if (!container) {
        console.error('Applications container not found!');
        return;
    }
    
    const user = JSON.parse(localStorage.getItem('currentUser'));
    console.log('Loading applications for user:', user.universityId);
    
    // Show enhanced loading state
    container.innerHTML = `
        <div class="loading-state" style="text-align: center; padding: 3rem;">
            <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: #014b3a; margin-bottom: 1rem;"></i>
            <p style="font-size: 1.1rem; color: #666;">Loading your applications...</p>
            <p style="font-size: 0.9rem; color: #999; margin-top: 0.5rem;">This may take a few seconds</p>
        </div>
    `;
    
    try {
        console.log('Making API call to get applications...');
        const response = await makeAPICall(CONFIG.ENDPOINTS.GET_APPLICATIONS, {
            universityId: user.universityId,
            userType: 'student'
        });
        
        console.log('API response received:', response);
        
        if (response.success && response.applications && response.applications.length > 0) {
            console.log('Found', response.applications.length, 'applications');
            container.innerHTML = '';
            
            response.applications.forEach(app => {
                const statusInfo = getStatusDisplay(app.status);
                
                const appCard = document.createElement('div');
                appCard.className = 'application-card';
                appCard.innerHTML = `
                    <div class="application-header">
                        <span class="application-id">Application #${app.applicationId}</span>
                        <span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>
                    </div>
                    <div class="application-details-grid">
                        <div class="detail-item">
                            <label>Applied On:</label>
                            <span>${formatDate(app.applicationDate)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Leave Period:</label>
                            <span>${formatDate(app.dateFrom)} to ${formatDate(app.dateTo)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Total Days:</label>
                            <span>${app.totalDays} days</span>
                        </div>
                        <div class="detail-item">
                            <label>Reason:</label>
                            <span>${app.reason}</span>
                        </div>
                    </div>
                    ${app.rejectionReason ? `
                        <div class="detail-item" style="margin-top: 10px;">
                            <label style="color: var(--danger-color);">Rejection Reason:</label>
                            <span style="color: var(--danger-color);">${app.rejectionReason}</span>
                        </div>
                    ` : ''}
                    <div class="application-actions">
                        <button class="btn btn-secondary btn-small" onclick="viewApplication('${app.applicationId}')">View Details</button>
                        ${app.proofUrl ? `<button class="btn btn-secondary btn-small" onclick="window.open('${app.proofUrl}', '_blank')">View Proof</button>` : ''}
                    </div>
                `;
                
                container.appendChild(appCard);
            });
        } else {
            console.log('No applications found or response.success is false');
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 3rem;">
                    <i class="fas fa-inbox" style="font-size: 4rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <p style="font-size: 1.2rem; color: #666; margin-bottom: 0.5rem;">No Applications Yet</p>
                    <p style="color: #999; margin-bottom: 1.5rem;">You haven't applied for any leave yet.</p>
                    <button onclick="window.location.href='apply-leave.html'" class="btn btn-primary">
                        <i class="fas fa-plus-circle"></i> Apply for Leave
                    </button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading applications:', error);
        console.error('Error stack:', error.stack);
        container.innerHTML = `
            <div class="error-state" style="text-align: center; padding: 3rem;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #dc3545; margin-bottom: 1rem;"></i>
                <p style="font-size: 1.2rem; color: #dc3545; margin-bottom: 0.5rem;">Failed to Load Applications</p>
                <p style="color: #666; margin-bottom: 1.5rem;">${error.message}</p>
                <button onclick="loadApplications()" class="btn btn-primary">
                    <i class="fas fa-redo"></i> Try Again
                </button>
                <button onclick="window.location.href='apply-leave.html'" class="btn btn-secondary" style="margin-left: 1rem;">
                    <i class="fas fa-plus-circle"></i> Apply for Leave
                </button>
            </div>
        `;
    }
    
    console.log('loadApplications function completed');
}

function viewApplication(applicationId) {
    // You can implement a detailed view modal here
    alert('Application details for: ' + applicationId);
}
