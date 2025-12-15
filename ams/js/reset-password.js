document.addEventListener('DOMContentLoaded', function() {
    // Get email and userType from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    const userType = urlParams.get('userType');
    
    if (email) {
        document.getElementById('email').value = email;
    }
    
    if (userType) {
        document.getElementById('userType').value = userType;
    }
    
    // If no email or userType, redirect to forgot password page
    if (!email || !userType) {
        window.location.href = 'forgot-password.html';
        return;
    }
    
    const form = document.getElementById('resetPasswordForm');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const resetCode = document.getElementById('resetCode').value.trim();
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const messageEl = document.getElementById('message');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Validation
        if (!resetCode) {
            showMessage(messageEl, 'Please enter the reset code.', false);
            return;
        }
        
        if (newPassword.length < 6) {
            showMessage(messageEl, 'Password must be at least 6 characters long.', false);
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showMessage(messageEl, 'Passwords do not match.', false);
            return;
        }
        
        // Disable button and show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
        
        try {
            const response = await makeAPICall('?action=resetPassword', {
                email: email,
                userType: userType,
                resetCode: resetCode,
                newPassword: newPassword
            });
            
            if (response.success) {
                showMessage(messageEl, 'Password reset successful! Redirecting to login...', true);
                
                // Redirect to appropriate login page
                setTimeout(() => {
                    if (userType === 'student') {
                        window.location.href = 'login.html';
                    } else {
                        window.location.href = 'staff-login.html';
                    }
                }, 2000);
            } else {
                showMessage(messageEl, response.message || 'Failed to reset password. Please check your reset code.', false);
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Reset Password';
            }
        } catch (error) {
            console.error('Reset password error:', error);
            showMessage(messageEl, 'Network error. Please try again.', false);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Reset Password';
        }
    });
});

function showMessage(el, text, success) {
    if (!el) return;
    el.style.display = 'block';
    el.textContent = text;
    el.className = 'message ' + (success ? 'success' : 'error');
}
