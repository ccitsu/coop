document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('vicedeanLoginForm');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const loginData = {
            email: document.getElementById('vicedeanEmail').value,
            password: document.getElementById('password').value,
            userType: 'vicedean'
        };
        
        try {
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Logging in...';
            submitBtn.disabled = true;
            
            const response = await makeAPICall(CONFIG.ENDPOINTS.VICEDEAN_LOGIN, loginData);
            
            if (response.success) {
                localStorage.setItem('currentUser', JSON.stringify({
                    ...response.user,
                    userType: 'vicedean'
                }));
                
                showMessage('message', 'Login successful! Redirecting...', 'success');
                
                setTimeout(() => {
                    window.location.href = 'vicedean-dashboard.html';
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
