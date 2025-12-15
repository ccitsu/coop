document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('advisorLoginForm');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const loginData = {
            email: document.getElementById('advisorEmail').value,
            password: document.getElementById('password').value,
            userType: 'advisor'
        };
        
        try {
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Logging in...';
            submitBtn.disabled = true;
            
            const response = await makeAPICall(CONFIG.ENDPOINTS.ADVISOR_LOGIN, loginData);
            
            if (response.success) {
                localStorage.setItem('currentUser', JSON.stringify({
                    ...response.user,
                    userType: 'advisor'
                }));
                
                showMessage('message', 'Login successful! Redirecting...', 'success');
                
                setTimeout(() => {
                    window.location.href = 'advisor-dashboard.html';
                }, 1000);
            } else {
                showMessage('message', response.message || 'Invalid credentials.', 'error');
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
