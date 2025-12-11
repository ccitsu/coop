// Google Apps Script for Field Training Permission System
// Paste this code in your Google Apps Script editor

/**
 * @OnlyCurrentDoc
 */

// Required OAuth Scopes
// @scope https://www.googleapis.com/auth/spreadsheets
// @scope https://www.googleapis.com/auth/drive
// @scope https://www.googleapis.com/auth/documents
// @scope https://www.googleapis.com/auth/script.send_mail

// Configuration
const SPREADSHEET_ID = '1v74E4bOLYipmLV2UET_CnHQpQTc6CwptTtMMgmXZh94'; // Replace with your Google Sheet ID
const TEMPLATE_DOC_ID = '189FXHnQtBg-ZkOWDSPPqCTtZa2DhR3J-5HrIUG7oFg4'; // Google Doc Template ID
const SHEET_NAMES = {
    users: 'Users',
    submissions: 'Submissions'
};

// Static Head of Unit Configuration
const HEAD_OF_UNIT = {
    name: 'أ. د. فهـد بن فرحان الرويلي', // Head of Unit Name in Arabic
    email: 'nayyar@su.edu.sa', // Replace with actual email
    signatureImageId: '1wlglv0lsxI9GaD9thATu4RZ23y-IOPld' // Replace with Google Drive image ID
};

// Function to get signature image URL
function getHeadSignatureURL() {
    return `https://drive.google.com/uc?export=view&id=${HEAD_OF_UNIT.signatureImageId}`;
}

// ==================== Setup Functions ====================

function setupSheets() {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Create Users sheet if not exists
    createSheetIfNotExists(spreadsheet, SHEET_NAMES.users, ['StudentID', 'Name', 'Email', 'Department', 'Phone', 'Gender', 'PasswordHash', 'CreatedDate']);
    
    // Create Submissions sheet if not exists
    createSheetIfNotExists(spreadsheet, SHEET_NAMES.submissions, ['SubmissionID', 'StudentID', 'StudentName', 'StudentEmail', 'StudentPhone', 'StudentDepartment', 'StudentGender', 'SubmittedDate', 'CompanyName', 'Status', 'PDFLink', 'ApprovalDate', 'ApproverEmail']);
}

function createSheetIfNotExists(spreadsheet, sheetName, headers) {
    try {
        spreadsheet.getSheetByName(sheetName);
    } catch (e) {
        const sheet = spreadsheet.insertSheet(sheetName);
        sheet.appendRow(headers);
    }
}

// ==================== Authentication Functions ====================

function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        const action = data.action;
        
        let response = {success: false, message: 'Unknown error'};
        
        if (action === 'login') {
            response = handleLogin(data);
        } else if (action === 'register') {
            response = handleRegister(data);
        } else if (action === 'getFormFields') {
            response = getFormFields();
        } else if (action === 'submitApplication') {
            response = submitApplication(data);
        } else if (action === 'adminLogin') {
            response = handleAdminLogin(data);
        } else if (action === 'getPendingApplications') {
            response = getPendingApplications();
        } else if (action === 'approveApplication') {
            response = approveApplication(data);
        } else if (action === 'rejectApplication') {
            response = rejectApplication(data);
        } else if (action === 'searchApplications') {
            response = searchApplications(data);
        } else if (action === 'test') {
            response = {success: true, message: 'Server is working', timestamp: new Date()};
        }
        
        return ContentService.createTextOutput(JSON.stringify(response))
            .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            message: 'Server error: ' + error.toString(),
            error: error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

function handleLogin(data) {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const usersSheet = spreadsheet.getSheetByName(SHEET_NAMES.users);
    const submissionsSheet = spreadsheet.getSheetByName(SHEET_NAMES.submissions);
    
    const usersData = usersSheet.getDataRange().getValues();
    
    // Verify input
    if (!data.email || !data.password) {
        return {success: false, message: 'Email and password required'};
    }
    
    const incomingHash = simpleHash(data.password);
    const incomingEmail = String(data.email).toLowerCase().trim();
    
    // Debug info - return all users for debugging
    const debugUsers = [];
    
    // Find user by email (case-insensitive)
    for (let i = 1; i < usersData.length; i++) {
        const cellEmail = String(usersData[i][2]).toLowerCase().trim();
        const cellHash = String(usersData[i][6]).trim();
        
        debugUsers.push({
            row: i + 1,
            email: String(usersData[i][2]),
            emailLower: cellEmail,
            storedHash: cellHash
        });
        
        if (cellEmail === incomingEmail) {
            // Verify password hash
            if (cellHash === incomingHash) {
                // Get user submissions
                const submissionsData = submissionsSheet.getDataRange().getValues();
                const userSubmissions = [];
                
                for (let j = 1; j < submissionsData.length; j++) {
                    if (String(submissionsData[j][1]).trim() === String(usersData[i][0]).trim()) {
                        userSubmissions.push({
                            submissionId: submissionsData[j][0],
                            companyName: submissionsData[j][8],
                            submittedDate: submissionsData[j][7],
                            status: submissionsData[j][9],
                            pdfLink: submissionsData[j][10]
                        });
                    }
                }
                
                return {
                    success: true,
                    user: {
                        id: String(usersData[i][0]).trim(),
                        name: usersData[i][1],
                        email: usersData[i][2],
                        department: usersData[i][3],
                        phone: usersData[i][4],
                        gender: usersData[i][5]
                    },
                    submissions: userSubmissions
                };
            } else {
                // Password mismatch - return debug info
                return {
                    success: false, 
                    message: 'Invalid email or password',
                    debug: {
                        incomingHash: incomingHash,
                        storedHash: cellHash,
                        hashesMatch: cellHash === incomingHash
                    }
                };
            }
        }
    }
    
    return {
        success: false, 
        message: 'Invalid email or password',
        debug: {
            searchingFor: incomingEmail,
            foundUsers: debugUsers
        }
    };
}

function handleRegister(data) {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const usersSheet = spreadsheet.getSheetByName(SHEET_NAMES.users);
    
    const usersData = usersSheet.getDataRange().getValues();
    
    // Check if email already exists
    for (let i = 1; i < usersData.length; i++) {
        if (usersData[i][2] === data.email) {
            return {success: false, message: 'Email already registered'};
        }
    }
    
    // Add new user
    usersSheet.appendRow([
        data.studentId,
        data.name,
        data.email,
        data.department,
        data.phone,
        data.gender,
        simpleHash(data.password),
        new Date()
    ]);
    
    return {success: true, message: 'Registration successful'};
}

// ==================== Form Functions ====================

function getFormFields() {
    // Only Company Name field required
    const fields = [
        {name: 'companyName', label: 'اسم الشركة - Company Name', type: 'text', required: true}
    ];
    
    return {success: true, fields: fields};
}

// ==================== Application Submission ====================

function submitApplication(data) {
    try {
        const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
        const submissionsSheet = spreadsheet.getSheetByName(SHEET_NAMES.submissions);
        const usersSheet = spreadsheet.getSheetByName(SHEET_NAMES.users);
        
        // Get user info from Users sheet
        const usersData = usersSheet.getDataRange().getValues();
        let studentInfo = null;
        
        for (let i = 1; i < usersData.length; i++) {
            // Match StudentID - convert both to string for comparison
            if (String(usersData[i][0]).trim() === String(data.userId).trim()) {
                studentInfo = {
                    studentId: usersData[i][0],
                    name: usersData[i][1],
                    email: usersData[i][2],
                    department: usersData[i][3],
                    phone: usersData[i][4],
                    gender: usersData[i][5]
                };
                break;
            }
        }
        
        if (!studentInfo) {
            return {success: false, message: 'Student not found'};
        }
        
        // Generate submission ID
        const submissionId = 'APP-' + Date.now();
        const companyName = data.formData.companyName;
        
        // Add submission to sheet with Pending Approval status
        submissionsSheet.appendRow([
            submissionId,
            studentInfo.studentId,
            studentInfo.name,
            studentInfo.email,
            studentInfo.phone,
            studentInfo.department,
            studentInfo.gender,
            new Date(),
            companyName,
            'WAITING FOR APPROVAL',
            '',
            '',
            ''
        ]);
        
        // Send notification email to head of unit
        sendPendingApprovalEmail(HEAD_OF_UNIT.email, studentInfo.name, studentInfo.studentId, companyName);
        
        return {
            success: true,
            message: 'Application submitted successfully and pending approval',
            submission: {
                submissionId: submissionId,
                companyName: companyName,
                submittedDate: new Date(),
                status: 'WAITING FOR APPROVAL',
                pdfLink: ''
            }
        };
    } catch (error) {
        return {success: false, message: 'Error submitting application: ' + error.toString()};
    }
}

// ==================== PDF Generation ====================

function generatePermissionLetterPDF(submissionId, studentInfo, companyName) {
    try {
        Logger.log('=== GENERATING PDF FROM TEMPLATE ===');
        Logger.log('Template ID: ' + TEMPLATE_DOC_ID);
        Logger.log('Submission ID: ' + submissionId);
        Logger.log('Student: ' + studentInfo.name);
        Logger.log('Company: ' + companyName);
        
        // Get the template file
        const templateFile = DriveApp.getFileById(TEMPLATE_DOC_ID);
        
        // Create a copy of the template
        const copiedFile = templateFile.makeCopy('Permission_Letter_' + submissionId);
        const docId = copiedFile.getId();
        Logger.log('Created copy with ID: ' + docId);
        
        // Open the copied document
        const doc = DocumentApp.openById(docId);
        const body = doc.getBody();
        
        // Replace all placeholders in the document
        const replacements = {
            '{{STUDENT_NAME}}': studentInfo.name,
            '{{STUDENT_ID}}': String(studentInfo.studentId),
            '{{DEPARTMENT}}': studentInfo.department,
            '{{EMAIL}}': studentInfo.email,
            '{{PHONE}}': String(studentInfo.phone),
            '{{COMPANY_NAME}}': companyName
        };
        
        Logger.log('Replacing placeholders...');
        Logger.log('Document body content preview:');
        const bodyText = body.getText();
        Logger.log('Found text length: ' + bodyText.length);
        
        // Log which placeholders we're looking for
        for (const placeholder in replacements) {
            const found = bodyText.includes(placeholder);
            Logger.log('Placeholder "' + placeholder + '" found in document: ' + found);
            if (found) {
                body.replaceText(placeholder, replacements[placeholder]);
                Logger.log('✓ Replaced ' + placeholder);
            } else {
                Logger.log('✗ NOT FOUND: ' + placeholder);
            }
        }
        
        // Save and close the document
        doc.saveAndClose();
        Logger.log('Document saved');
        
        // Export as PDF
        Logger.log('Exporting as PDF...');
        const pdfBlob = DriveApp.getFileById(docId).getAs('application/pdf');
        
        // Save PDF to Drive
        const pdfFile = DriveApp.createFile(pdfBlob);
        pdfFile.setName('Permission_Letter_' + submissionId + '.pdf');
        
        // Set sharing permissions
        pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        const pdfUrl = pdfFile.getUrl();
        
        Logger.log('PDF created: ' + pdfUrl);
        
        // Optional: Delete the temporary Google Doc (keep only PDF)
        DriveApp.getFileById(docId).setTrashed(true);
        Logger.log('Temporary document deleted');
        
        Logger.log('✓ PDF GENERATION COMPLETE');
        return pdfUrl;
        
    } catch (error) {
        Logger.log('✗ ERROR GENERATING PDF: ' + error);
        Logger.log('Error details: ' + error.stack);
        throw error;
    }
}

// ==================== Admin Functions ====================

function handleAdminLogin(data) {
    // Validate input
    if (!data || !data.email) {
        return {success: false, message: 'Email is required'};
    }
    
    // Simple admin authentication - check if email matches HEAD_OF_UNIT
    if (data.email === HEAD_OF_UNIT.email) {
        // In production, add proper password verification
        // For now, we'll use a simple check
        return {
            success: true,
            admin: {
                name: HEAD_OF_UNIT.name,
                email: HEAD_OF_UNIT.email
            }
        };
    }
    return {success: false, message: 'Invalid admin credentials'};
}

// Test function for admin login
function testAdminLogin() {
    const testData = {
        email: HEAD_OF_UNIT.email,
        password: 'test123'
    };
    
    const result = handleAdminLogin(testData);
    Logger.log('Admin Login Test Result:');
    Logger.log(JSON.stringify(result, null, 2));
    return result;
}

function getPendingApplications() {
    try {
        const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
        const submissionsSheet = spreadsheet.getSheetByName(SHEET_NAMES.submissions);
        const submissionsData = submissionsSheet.getDataRange().getValues();
        
        const applications = [];
        
        for (let i = 1; i < submissionsData.length; i++) {
            const status = String(submissionsData[i][9]).trim();
            applications.push({
                submissionId: submissionsData[i][0],
                studentId: submissionsData[i][1],
                studentName: submissionsData[i][2],
                studentEmail: submissionsData[i][3],
                studentPhone: submissionsData[i][4],
                department: submissionsData[i][5],
                gender: submissionsData[i][6],
                submittedDate: submissionsData[i][7],
                companyName: submissionsData[i][8],
                status: status,
                pdfLink: submissionsData[i][10] || '',
                approvalDate: submissionsData[i][11] || '',
                approverEmail: submissionsData[i][12] || ''
            });
        }
        
        return {success: true, applications: applications};
    } catch (error) {
        return {success: false, message: 'Error fetching applications: ' + error.toString()};
    }
}

function approveApplication(data) {
    try {
        const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
        const submissionsSheet = spreadsheet.getSheetByName(SHEET_NAMES.submissions);
        const submissionsData = submissionsSheet.getDataRange().getValues();
        
        let rowIndex = -1;
        let studentInfo = null;
        let companyName = '';
        
        // Find the submission
        for (let i = 1; i < submissionsData.length; i++) {
            if (String(submissionsData[i][0]).trim() === data.submissionId) {
                rowIndex = i + 1;
                studentInfo = {
                    studentId: submissionsData[i][1],
                    name: submissionsData[i][2],
                    email: submissionsData[i][3],
                    phone: submissionsData[i][4],
                    department: submissionsData[i][5],
                    gender: submissionsData[i][6]
                };
                companyName = submissionsData[i][8];
                break;
            }
        }
        
        if (rowIndex === -1) {
            return {success: false, message: 'Application not found'};
        }
        
        // Generate PDF
        let pdfLink = '';
        try {
            pdfLink = generatePermissionLetterPDF(data.submissionId, studentInfo, companyName);
        } catch (pdfError) {
            return {success: false, message: 'Error generating PDF: ' + pdfError.toString()};
        }
        
        // Update submission with approval
        submissionsSheet.getRange(rowIndex, 10).setValue('APPROVED');
        submissionsSheet.getRange(rowIndex, 11).setValue(pdfLink);
        submissionsSheet.getRange(rowIndex, 12).setValue(new Date());
        submissionsSheet.getRange(rowIndex, 13).setValue(data.approverEmail);
        
        // Send approval emails
        sendApprovalEmail(studentInfo.email, studentInfo.name, pdfLink, companyName);
        sendApprovalNotificationToHead(data.approverEmail, studentInfo.name, studentInfo.studentId, companyName, pdfLink);
        
        return {
            success: true,
            message: 'Application approved successfully',
            pdfLink: pdfLink
        };
    } catch (error) {
        return {success: false, message: 'Error approving application: ' + error.toString()};
    }
}

function rejectApplication(data) {
    try {
        const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
        const submissionsSheet = spreadsheet.getSheetByName(SHEET_NAMES.submissions);
        const submissionsData = submissionsSheet.getDataRange().getValues();
        
        let rowIndex = -1;
        let studentInfo = null;
        let companyName = '';
        
        // Find the submission
        for (let i = 1; i < submissionsData.length; i++) {
            if (String(submissionsData[i][0]).trim() === data.submissionId) {
                rowIndex = i + 1;
                studentInfo = {
                    name: submissionsData[i][2],
                    email: submissionsData[i][3],
                    studentId: submissionsData[i][1]
                };
                companyName = submissionsData[i][8];
                break;
            }
        }
        
        if (rowIndex === -1) {
            return {success: false, message: 'Application not found'};
        }
        
        // Update submission with rejection
        submissionsSheet.getRange(rowIndex, 10).setValue('REJECTED');
        submissionsSheet.getRange(rowIndex, 12).setValue(new Date());
        submissionsSheet.getRange(rowIndex, 13).setValue(data.approverEmail);
        
        // Send rejection emails
        sendRejectionEmail(studentInfo.email, studentInfo.name, companyName, data.reason || 'No reason provided');
        sendRejectionNotificationToHead(data.approverEmail, studentInfo.name, studentInfo.studentId, companyName);
        
        return {
            success: true,
            message: 'Application rejected'
        };
    } catch (error) {
        return {success: false, message: 'Error rejecting application: ' + error.toString()};
    }
}

function searchApplications(data) {
    try {
        const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
        const submissionsSheet = spreadsheet.getSheetByName(SHEET_NAMES.submissions);
        const submissionsData = submissionsSheet.getDataRange().getValues();
        
        const searchTerm = String(data.searchTerm).toLowerCase().trim();
        const applications = [];
        
        for (let i = 1; i < submissionsData.length; i++) {
            const studentId = String(submissionsData[i][1]).toLowerCase().trim();
            const studentEmail = String(submissionsData[i][3]).toLowerCase().trim();
            
            if (studentId.includes(searchTerm) || studentEmail.includes(searchTerm)) {
                applications.push({
                    submissionId: submissionsData[i][0],
                    studentId: submissionsData[i][1],
                    studentName: submissionsData[i][2],
                    studentEmail: submissionsData[i][3],
                    studentPhone: submissionsData[i][4],
                    department: submissionsData[i][5],
                    gender: submissionsData[i][6],
                    submittedDate: submissionsData[i][7],
                    companyName: submissionsData[i][8],
                    status: submissionsData[i][9],
                    pdfLink: submissionsData[i][10] || '',
                    approvalDate: submissionsData[i][11] || '',
                    approverEmail: submissionsData[i][12] || ''
                });
            }
        }
        
        return {success: true, applications: applications};
    } catch (error) {
        return {success: false, message: 'Error searching applications: ' + error.toString()};
    }
}

// ==================== Email Functions ====================

function sendPendingApprovalEmail(recipientEmail, studentName, studentId, companyName) {
    try {
        const subject = 'New Application Pending Approval - ' + studentName;
        const message = `Dear Head of Unit,\n\nA new field training application has been submitted and is awaiting your approval.\n\nStudent Name: ${studentName}\nStudent ID: ${studentId}\nCompany: ${companyName}\n\nPlease login to the approval dashboard to review and approve/reject this application.\n\nBest regards,\nField Training System`;
        
        MailApp.sendEmail(recipientEmail, subject, message);
        Logger.log('Pending approval email sent to: ' + recipientEmail);
    } catch (error) {
        Logger.log('Error sending email: ' + error);
    }
}

function sendApprovalEmail(studentEmail, studentName, pdfLink, companyName) {
    try {
        const subject = 'Field Training Application Approved';
        const message = `Dear ${studentName},\n\nCongratulations! Your field training application for ${companyName} has been approved.\n\nYour permission letter has been generated and is ready for download.\n\nDownload PDF: ${pdfLink}\n\nPlease download and use this letter for your field training.\n\nBest regards,\nAcademic Department`;
        
        MailApp.sendEmail(studentEmail, subject, message);
        Logger.log('Approval email sent to student: ' + studentEmail);
    } catch (error) {
        Logger.log('Error sending approval email: ' + error);
    }
}

function sendApprovalNotificationToHead(headEmail, studentName, studentId, companyName, pdfLink) {
    try {
        const subject = 'Application Approved - ' + studentName;
        const message = `Dear Head of Unit,\n\nYou have successfully approved the field training application for:\n\nStudent Name: ${studentName}\nStudent ID: ${studentId}\nCompany: ${companyName}\n\nGenerated PDF: ${pdfLink}\n\nThe student has been notified via email.\n\nBest regards,\nField Training System`;
        
        MailApp.sendEmail(headEmail, subject, message);
        Logger.log('Approval notification sent to head: ' + headEmail);
    } catch (error) {
        Logger.log('Error sending approval notification: ' + error);
    }
}

function sendRejectionEmail(studentEmail, studentName, companyName, reason) {
    try {
        const subject = 'Field Training Application - Status Update';
        const message = `Dear ${studentName},\n\nWe regret to inform you that your field training application for ${companyName} has not been approved at this time.\n\nReason: ${reason}\n\nPlease contact the academic department for more information or to submit a revised application.\n\nBest regards,\nAcademic Department`;
        
        MailApp.sendEmail(studentEmail, subject, message);
        Logger.log('Rejection email sent to student: ' + studentEmail);
    } catch (error) {
        Logger.log('Error sending rejection email: ' + error);
    }
}

function sendRejectionNotificationToHead(headEmail, studentName, studentId, companyName) {
    try {
        const subject = 'Application Rejected - ' + studentName;
        const message = `Dear Head of Unit,\n\nYou have rejected the field training application for:\n\nStudent Name: ${studentName}\nStudent ID: ${studentId}\nCompany: ${companyName}\n\nThe student has been notified via email.\n\nBest regards,\nField Training System`;
        
        MailApp.sendEmail(headEmail, subject, message);
        Logger.log('Rejection notification sent to head: ' + headEmail);
    } catch (error) {
        Logger.log('Error sending rejection notification: ' + error);
    }
}

// ==================== Utility Functions ====================

function simpleHash(str) {
    // Simple hash function - in production, use a more secure method
    let hash = 0;
    if (str && str.length > 0) {
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
    }
    const result = 'hash_' + Math.abs(hash).toString(36);
    return result;
}

// Test function
function testSetup() {
    setupSheets();
    Logger.log('Sheets setup complete');
}

// Authorization function - Run this first to grant permissions
function authorizePermissions() {
    // This function requests all necessary permissions
    try {
        // Request Spreadsheet permissions
        SpreadsheetApp.openById(SPREADSHEET_ID);
        
        // Request Document permissions
        DocumentApp.openById(TEMPLATE_DOC_ID);
        
        // Request Drive permissions
        DriveApp.getFileById(TEMPLATE_DOC_ID);
        
        // Request Mail permissions
        MailApp.getRemainingDailyQuota();
        
        Logger.log('✓ All permissions granted successfully');
        return 'Authorization successful! You can now use the system.';
    } catch (error) {
        Logger.log('✗ Authorization error: ' + error);
        return 'Authorization failed: ' + error.toString();
    }
}

// Test PDF Generation with sample data
function testPDFGeneration() {
    try {
        // Sample student info for testing
        const testStudentInfo = {
            studentId: '12345',
            name: 'أحمد محمد',
            email: 'student@example.com',
            department: 'علوم الحاسب',
            phone: '0501234567',
            gender: 'Male'
        };
        
        const testCompanyName = 'شركة الاختبار';
        const testSubmissionId = 'TEST-' + Date.now();
        
        Logger.log('Testing PDF generation with sample data...');
        const pdfUrl = generatePermissionLetterPDF(testSubmissionId, testStudentInfo, testCompanyName);
        
        Logger.log('✓ Test successful!');
        Logger.log('PDF URL: ' + pdfUrl);
        return 'Test successful! PDF URL: ' + pdfUrl;
    } catch (error) {
        Logger.log('✗ Test failed: ' + error);
        return 'Test failed: ' + error.toString();
    }
}

// Debug function - Check users in the sheet
function debugUsers() {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const usersSheet = spreadsheet.getSheetByName(SHEET_NAMES.users);
    const usersData = usersSheet.getDataRange().getValues();
    
    Logger.log('=== USERS DEBUG ===');
    Logger.log('Total rows: ' + usersData.length);
    Logger.log('Headers: ' + JSON.stringify(usersData[0]));
    
    for (let i = 1; i < usersData.length; i++) {
        Logger.log('\n--- User ' + i + ' ---');
        Logger.log('StudentID (col 0): ' + usersData[i][0]);
        Logger.log('Name (col 1): ' + usersData[i][1]);
        Logger.log('Email (col 2): ' + usersData[i][2]);
        Logger.log('Department (col 3): ' + usersData[i][3]);
        Logger.log('Phone (col 4): ' + usersData[i][4]);
        Logger.log('Gender (col 5): ' + usersData[i][5]);
        Logger.log('PasswordHash (col 6): ' + usersData[i][6]);
        Logger.log('CreatedDate (col 7): ' + usersData[i][7]);
    }
}

// Test password hash
function testPasswordHash() {
    const testPassword = 'test123';
    const hash = simpleHash(testPassword);
    Logger.log('Password: ' + testPassword);
    Logger.log('Hash: ' + hash);
}
