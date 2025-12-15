let currentFilter = 'pending';
let allApplications = [];
let currentApplicationId = null;

document.addEventListener('DOMContentLoaded', async function() {
    const user = checkAuth();
    if (!user || user.userType !== 'hod') {
        window.location.href = 'hod-login.html';
        return;
    }
    
    document.getElementById('hodNameDisplay').textContent = user.name || user.email;
    document.getElementById('departmentName').textContent = user.department;
    
    setupFilterButtons();
    await loadApplications();
    setupModal();
});

function setupFilterButtons() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.getAttribute('data-filter');
            displayApplications();
        });
    });
}

async function loadApplications() {
    const container = document.getElementById('applicationsContainer');
    const user = JSON.parse(localStorage.getItem('currentUser'));
    
    // Show enhanced loading state
    container.innerHTML = `
        <div class="loading-state" style="text-align: center; padding: 3rem;">
            <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: #014b3a; margin-bottom: 1rem;"></i>
            <p style="font-size: 1.1rem; color: #666;">Loading applications...</p>
            <p style="font-size: 0.9rem; color: #999; margin-top: 0.5rem;">Please wait</p>
        </div>
    `;
    
    try {
        const response = await makeAPICall(CONFIG.ENDPOINTS.GET_APPLICATIONS, {
            department: user.department,
            userType: 'hod'
        });
        
        if (response.success) {
            allApplications = response.applications || [];
            displayApplications();
        } else {
            container.innerHTML = `
                <div class="error-state" style="text-align: center; padding: 3rem;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #dc3545; margin-bottom: 1rem;"></i>
                    <p style="font-size: 1.2rem; color: #dc3545; margin-bottom: 0.5rem;">Failed to Load Applications</p>
                    <button onclick="loadApplications()" class="btn btn-primary">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            `;
        }
    } catch (error) {
        container.innerHTML = `
            <div class="error-state" style="text-align: center; padding: 3rem;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #dc3545; margin-bottom: 1rem;"></i>
                <p style="font-size: 1.2rem; color: #dc3545; margin-bottom: 0.5rem;">Error Loading Applications</p>
                <p style="color: #666; margin-bottom: 1.5rem;">${error.message}</p>
                <button onclick="loadApplications()" class="btn btn-primary">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    }
}

function displayApplications() {
    const container = document.getElementById('applicationsContainer');
    
    let filteredApps = allApplications;
    
    if (currentFilter === 'pending') {
        filteredApps = allApplications.filter(app => app.status === 'Advisor Approved');
    } else if (currentFilter === 'approved') {
        filteredApps = allApplications.filter(app => 
            app.status === 'HOD Approved' || 
            app.status === 'Approved'
        );
    } else if (currentFilter === 'rejected') {
        filteredApps = allApplications.filter(app => app.status === 'Rejected' && app.rejectorType === 'hod');
    }
    
    if (filteredApps.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 3rem;">
                <i class="fas fa-inbox" style="font-size: 4rem; color: #ccc; margin-bottom: 1rem;"></i>
                <p style="font-size: 1.2rem; color: #666; margin-bottom: 0.5rem;">No Applications Found</p>
                <p style="color: #999;">No ${currentFilter} applications for your department.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    filteredApps.forEach(app => {
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
                    <label>Student Name:</label>
                    <span>${app.studentName}</span>
                </div>
                <div class="detail-item">
                    <label>University ID:</label>
                    <span>${app.universityId}</span>
                </div>
                <div class="detail-item">
                    <label>Academic Advisor:</label>
                    <span>${app.advisorName}</span>
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
                    <label>Advisor Approved:</label>
                    <span>${app.advisorApprovalDate ? formatDate(app.advisorApprovalDate) : 'N/A'}</span>
                </div>
            </div>
            <div class="application-actions">
                <button class="btn btn-primary btn-small" onclick="reviewApplication('${app.applicationId}')">Review</button>
                ${app.proofUrl ? `<button class="btn btn-secondary btn-small" onclick="window.open('${app.proofUrl}', '_blank')">View Proof</button>` : ''}
            </div>
        `;
        
        container.appendChild(appCard);
    });
}

function reviewApplication(applicationId) {
    currentApplicationId = applicationId;
    const app = allApplications.find(a => a.applicationId === applicationId);
    
    if (!app) return;
    
    const detailsContainer = document.getElementById('applicationDetails');
    
    let coursesHTML = '<h4>Courses Missed:</h4><ul>';
    app.courses.forEach((course, index) => {
        coursesHTML += `<li><strong>${course.courseName}</strong> - ${course.teacherName} (${course.classType})</li>`;
    });
    coursesHTML += '</ul>';
    
    detailsContainer.innerHTML = `
        <div class="application-details-grid">
            <div class="detail-item">
                <label>Student Name:</label>
                <span>${app.studentName}</span>
            </div>
            <div class="detail-item">
                <label>University ID:</label>
                <span>${app.universityId}</span>
            </div>
            <div class="detail-item">
                <label>Email:</label>
                <span>${app.email}</span>
            </div>
            <div class="detail-item">
                <label>Department:</label>
                <span>${app.department}</span>
            </div>
            <div class="detail-item">
                <label>Academic Advisor:</label>
                <span>${app.advisorName}</span>
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
                <label>Advisor Approved:</label>
                <span>${app.advisorApprovalDate ? formatDate(app.advisorApprovalDate) : 'N/A'}</span>
            </div>
        </div>
        <div style="margin-top: 20px;">
            <label><strong>Reason for Leave:</strong></label>
            <p>${app.reason}</p>
        </div>
        <div style="margin-top: 20px;">
            ${coursesHTML}
        </div>
        ${app.proofUrl ? `
            <div style="margin-top: 20px;">
                <button class="btn btn-secondary" onclick="window.open('${app.proofUrl}', '_blank')">View Proof Document</button>
            </div>
        ` : ''}
        <div style="margin-top: 20px; padding: 15px; background: #d4edda; border-radius: 5px;">
            <strong style="color: #155724;">✓ Approved by Academic Advisor</strong>
        </div>
    `;
    
    document.getElementById('reviewModal').style.display = 'block';
    document.getElementById('rejectReasonGroup').style.display = 'none';
}

function setupModal() {
    const modal = document.getElementById('reviewModal');
    const closeBtn = document.querySelector('.close');
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    const confirmRejectBtn = document.getElementById('confirmRejectBtn');
    
    closeBtn.onclick = closeModal;
    
    window.onclick = function(event) {
        if (event.target == modal) {
            closeModal();
        }
    };
    
    approveBtn.addEventListener('click', async function() {
        if (!confirm('Are you sure you want to approve this application?')) return;
        
        try {
            const user = JSON.parse(localStorage.getItem('currentUser'));
            const response = await makeAPICall(CONFIG.ENDPOINTS.APPROVE_APPLICATION, {
                applicationId: currentApplicationId,
                approverType: 'hod',
                approverName: user.name || user.email,
                approvalDate: new Date().toISOString()
            });
            
            if (response.success) {
                alert('Application approved successfully! Forwarded to Vice Dean.');
                closeModal();
                await loadApplications();
            } else {
                alert('Failed to approve application: ' + response.message);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    });
    
    rejectBtn.addEventListener('click', function() {
        document.getElementById('rejectReasonGroup').style.display = 'block';
    });
    
    confirmRejectBtn.addEventListener('click', async function() {
        const reason = document.getElementById('rejectionReason').value;
        
        if (!reason.trim()) {
            alert('Please provide a reason for rejection.');
            return;
        }
        
        try {
            const user = JSON.parse(localStorage.getItem('currentUser'));
            const response = await makeAPICall(CONFIG.ENDPOINTS.REJECT_APPLICATION, {
                applicationId: currentApplicationId,
                rejectorType: 'hod',
                rejectorName: user.name || user.email,
                rejectionReason: reason,
                rejectionDate: new Date().toISOString()
            });
            
            if (response.success) {
                alert('Application rejected.');
                closeModal();
                await loadApplications();
            } else {
                alert('Failed to reject application: ' + response.message);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    });
}

function closeModal() {
    document.getElementById('reviewModal').style.display = 'none';
    document.getElementById('rejectionReason').value = '';
}
