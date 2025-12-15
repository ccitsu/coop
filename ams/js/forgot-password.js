document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('forgotPasswordForm');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const userType = document.getElementById('userType').value;
        const messageEl = document.getElementById('message');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        if (!email || !userType) {
            showMessage(messageEl, 'Please fill in all fields.', false);
            return;
        }
        
        // Disable button and show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        
        try {
            const response = await makeAPICall('?action=requestPasswordReset', {
                email: email,
                userType: userType
            });
            
            if (response.success) {
                showMessage(messageEl, 'Reset code sent! Check your email and use the code to reset your password.', true);
                
                // Redirect to reset page after 2 seconds
                setTimeout(() => {
                    window.location.href = `reset-password.html?email=${encodeURIComponent(email)}&userType=${userType}`;
                }, 2000);
            } else {
                showMessage(messageEl, response.message || 'Failed to send reset code. Please verify your email and user type.', false);
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Code';
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            showMessage(messageEl, 'Network error. Please try again.', false);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Code';
        }
    });
});

function showMessage(el, text, success) {
    if (!el) return;
    el.style.display = 'block';
    el.textContent = text;
    el.className = 'message ' + (success ? 'success' : 'error');
}
