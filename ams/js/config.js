// Configuration file - Update these values with your Google Apps Script Web App URL
const CONFIG = {
    // Replace this URL with your deployed Google Apps Script Web App URL
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyIC5pLW6gT_sKQRFj0k9noXZdvxHLYIbfEjRrSkkB0RKm9hxuvtEYJ2NDoTpSkbOG9cA/exec',
    
    // API Endpoints
    ENDPOINTS: {
        REGISTER: '?action=register',
        LOGIN: '?action=login',
        APPLY_LEAVE: '?action=applyLeave',
        GET_APPLICATIONS: '?action=getApplications',
        GET_STUDENT_INFO: '?action=getStudentInfo',
        APPROVE_APPLICATION: '?action=approveApplication',
        REJECT_APPLICATION: '?action=rejectApplication',
        UPLOAD_FILE: '?action=uploadFile',
        ADVISOR_LOGIN: '?action=advisorLogin',
        HOD_LOGIN: '?action=hodLogin',
        VICEDEAN_LOGIN: '?action=vicedeanLogin',
        GET_ADVISORS: '?action=getAdvisors'
    }
};

// Helper function to create fetch with timeout
function fetchWithTimeout(url, options, timeout = 20000) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout - Server is taking too long to respond')), timeout)
        )
    ]);
}

// Helper function to make API calls with timeout and retry
async function makeAPICall(endpoint, data, retries = 1) {
    let lastError;
    
    for (let i = 0; i <= retries; i++) {
        try {
            console.log(`API Call attempt ${i + 1} to ${endpoint}`);
            console.log('Request data:', data);
            
            // Google Apps Script requires specific fetch configuration
            const response = await fetchWithTimeout(CONFIG.SCRIPT_URL + endpoint, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                redirect: 'follow',
                body: JSON.stringify(data)
            }, 20000); // 20 second timeout for Google Apps Script
            
            // Check if response is ok
            if (!response.ok) {
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }
            
            // Try to parse JSON
            const text = await response.text();
            console.log('Raw response:', text);
            
            let result;
            try {
                result = JSON.parse(text);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                throw new Error('Invalid response from server. Please try again.');
            }
            
            console.log('API Response:', result);
            return result;
            
        } catch (error) {
            console.error(`API Call Error (attempt ${i + 1}):`, error);
            lastError = error;
            
            // Don't retry on last attempt
            if (i < retries) {
                console.log(`Retrying in 1 second...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
    
    // All retries failed
    const errorMsg = lastError.message || 'Failed to connect to server';
    console.error('All retries failed:', errorMsg);
    
    // Provide more helpful error messages
    if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
        throw new Error('Unable to connect to the server. Please check your internet connection and try again.');
    } else if (errorMsg.includes('timeout')) {
        throw new Error('The server is taking too long to respond. Please try again in a moment.');
    } else {
        throw new Error(errorMsg);
    }
}

// Helper function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Helper function to show message
function showMessage(elementId, message, type = 'info') {
    const messageEl = document.getElementById(elementId);
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

// Helper function to check authentication
function checkAuth() {
    const user = localStorage.getItem('currentUser');
    if (!user) {
        window.location.href = 'login.html';
        return null;
    }
    return JSON.parse(user);
}

// Helper function to logout
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// Helper function to get status display
function getStatusDisplay(status) {
    const statusMap = {
        'Pending': { text: 'Pending Review', class: 'status-pending' },
        'Advisor Approved': { text: 'Advisor Approved', class: 'status-advisor-approved' },
        'HOD Approved': { text: 'HOD Approved', class: 'status-hod-approved' },
        'Approved': { text: 'Finally Approved', class: 'status-approved' },
        'Rejected': { text: 'Rejected', class: 'status-rejected' }
    };
    
    return statusMap[status] || { text: status, class: 'status-pending' };
}

// Convert file to Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
