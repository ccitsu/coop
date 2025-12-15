let courseCount = 1;
const MAX_COURSES = 5;

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const user = checkAuth();
    if (!user) return;
    
    const form = document.getElementById('leaveApplicationForm');
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    const totalDays = document.getElementById('totalDays');
    const addCourseBtn = document.getElementById('addCourseBtn');
    
    // Calculate total days when dates change
    dateFrom.addEventListener('change', calculateDays);
    dateTo.addEventListener('change', calculateDays);
    
    function calculateDays() {
        if (dateFrom.value && dateTo.value) {
            const from = new Date(dateFrom.value);
            const to = new Date(dateTo.value);
            
            if (to >= from) {
                const diffTime = Math.abs(to - from);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                totalDays.value = diffDays;
            } else {
                alert('End date must be after start date');
                dateTo.value = '';
                totalDays.value = '';
            }
        }
    }
    
    // Add course functionality
    addCourseBtn.addEventListener('click', function() {
        if (courseCount >= MAX_COURSES) {
            alert('Maximum 5 courses can be added');
            return;
        }
        
        courseCount++;
        const coursesContainer = document.getElementById('coursesContainer');
        
        const courseEntry = document.createElement('div');
        courseEntry.className = 'course-entry';
        courseEntry.setAttribute('data-course', courseCount);
        courseEntry.innerHTML = `
            <div class="course-header">
                <h4>Course ${courseCount}</h4>
                <button type="button" class="remove-course-btn" onclick="removeCourse(${courseCount})">Remove</button>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="courseName${courseCount}">Course Name *</label>
                    <input type="text" id="courseName${courseCount}" name="courseName${courseCount}" required>
                </div>
                <div class="form-group">
                    <label for="teacherName${courseCount}">Teacher Name *</label>
                    <input type="text" id="teacherName${courseCount}" name="teacherName${courseCount}" required>
                </div>
            </div>
            <div class="form-group">
                <label for="classType${courseCount}">Class Type *</label>
                <select id="classType${courseCount}" name="classType${courseCount}" required>
                    <option value="">Select Type</option>
                    <option value="Lecture">Lecture</option>
                    <option value="Practical">Practical</option>
                    <option value="Tutorial">Tutorial</option>
                </select>
            </div>
        `;
        
        coursesContainer.appendChild(courseEntry);
        
        if (courseCount >= MAX_COURSES) {
            addCourseBtn.style.display = 'none';
        }
    });
    
    // File input change handler
    const fileInput = document.getElementById('proofDocument');
    fileInput.addEventListener('change', function() {
        const fileName = this.files[0]?.name || 'No file chosen';
        const fileNameDisplay = document.querySelector('.file-name');
        if (fileNameDisplay) {
            fileNameDisplay.textContent = fileName;
        }
    });
    
    // Drag and drop functionality
    const fileInputWrapper = document.querySelector('.file-input-wrapper');
    if (fileInputWrapper) {
        fileInputWrapper.addEventListener('dragover', function(e) {
            e.preventDefault();
            fileInputWrapper.style.borderColor = '#b08855';
            fileInputWrapper.style.backgroundColor = '#f8f9fa';
        });
        
        fileInputWrapper.addEventListener('dragleave', function(e) {
            e.preventDefault();
            fileInputWrapper.style.borderColor = '#dee2e6';
            fileInputWrapper.style.backgroundColor = 'white';
        });
        
        fileInputWrapper.addEventListener('drop', function(e) {
            e.preventDefault();
            fileInputWrapper.style.borderColor = '#dee2e6';
            fileInputWrapper.style.backgroundColor = 'white';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                // Trigger change event
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    }
    
    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const user = JSON.parse(localStorage.getItem('currentUser'));
        
        // Collect course data
        const courses = [];
        for (let i = 1; i <= courseCount; i++) {
            const courseNameEl = document.getElementById(`courseName${i}`);
            if (courseNameEl) {
                courses.push({
                    courseName: courseNameEl.value,
                    teacherName: document.getElementById(`teacherName${i}`).value,
                    classType: document.getElementById(`classType${i}`).value
                });
            }
        }
        
        // Get file
        const fileInput = document.getElementById('proofDocument');
        const file = fileInput.files[0];
        
        if (!file) {
            showMessage('message', 'Please upload a proof document.', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showMessage('message', 'File size must be less than 5MB.', 'error');
            return;
        }
        
        try {
            // Show loading
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Submitting...';
            submitBtn.disabled = true;
            
            // Convert file to base64
            const fileData = await fileToBase64(file);
            
            // Prepare application data
            const applicationData = {
                universityId: user.universityId,
                studentName: user.studentName,
                email: user.email,
                department: user.department,
                advisorName: user.advisorName,
                dateFrom: dateFrom.value,
                dateTo: dateTo.value,
                totalDays: totalDays.value,
                reason: document.getElementById('reason').value,
                courses: courses,
                proofFile: {
                    data: fileData,
                    name: file.name,
                    mimeType: file.type
                },
                applicationDate: new Date().toISOString(),
                status: 'Pending'
            };
            
            // Make API call
            const response = await makeAPICall(CONFIG.ENDPOINTS.APPLY_LEAVE, applicationData);
            
            if (response.success) {
                showMessage('message', 'Application submitted successfully!', 'success');
                
                // Redirect to dashboard after 2 seconds
                setTimeout(() => {
                    window.location.href = 'student-dashboard.html';
                }, 2000);
            } else {
                showMessage('message', response.message || 'Failed to submit application.', 'error');
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        } catch (error) {
            showMessage('message', error.message, 'error');
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Submit Application';
            submitBtn.disabled = false;
        }
    });
});

function removeCourse(courseNum) {
    const courseEntry = document.querySelector(`[data-course="${courseNum}"]`);
    if (courseEntry) {
        courseEntry.remove();
        courseCount--;
        
        if (courseCount < MAX_COURSES) {
            document.getElementById('addCourseBtn').style.display = 'block';
        }
    }
}
