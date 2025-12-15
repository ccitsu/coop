document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get form data
        const loginData = {
            universityId: document.getElementById('universityId').value,
            password: document.getElementById('password').value
        };
        
        try {
            // Show loading
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Logging in...';
            submitBtn.disabled = true;
            
            // Make API call
            const response = await makeAPICall(CONFIG.ENDPOINTS.LOGIN, loginData);
            
            if (response.success) {
                // Store user data in localStorage
                localStorage.setItem('currentUser', JSON.stringify(response.user));
                
                showMessage('message', 'Login successful! Redirecting...', 'success');
                
                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = 'student-dashboard.html';
                }, 1000);
            } else {
                showMessage('message', response.message || 'Invalid credentials. Please try again.', 'error');
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        } catch (error) {
            showMessage('message', error.message, 'error');
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Login';
            submitBtn.disabled = false;
        }
    });
});
