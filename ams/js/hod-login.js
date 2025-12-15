document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('hodLoginForm');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const loginData = {
            email: document.getElementById('hodEmail').value,
            password: document.getElementById('password').value,
            department: document.getElementById('department').value,
            userType: 'hod'
        };
        
        try {
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Logging in...';
            submitBtn.disabled = true;
            
            const response = await makeAPICall(CONFIG.ENDPOINTS.HOD_LOGIN, loginData);
            
            if (response.success) {
                localStorage.setItem('currentUser', JSON.stringify({
                    ...response.user,
                    userType: 'hod',
                    department: loginData.department
                }));
                
                showMessage('message', 'Login successful! Redirecting...', 'success');
                
                setTimeout(() => {
                    window.location.href = 'hod-dashboard.html';
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
