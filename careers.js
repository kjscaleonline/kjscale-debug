// ===== Careers Page JavaScript =====

// Modal Functions
function openOpportunitiesModal() {
    const modal = document.getElementById('opportunitiesModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeOpportunitiesModal() {
    const modal = document.getElementById('opportunitiesModal');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

// Close modal when clicking outside of it
window.addEventListener('click', function(event) {
    const modal = document.getElementById('opportunitiesModal');
    if (event.target === modal) {
        closeOpportunitiesModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeOpportunitiesModal();
    }
});

// Scroll to application section and close modal
function scrollToApplicationAndClose() {
    closeOpportunitiesModal();
    scrollToApplication();
}

// Scroll to application section
function scrollToApplication() {
    const applicationSection = document.getElementById('application');
    if (applicationSection) {
        applicationSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Handle form submission
function handleApplicationSubmit(event) {
    event.preventDefault();
    
    const formData = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        position: document.getElementById('position').value,
        experience: document.getElementById('experience').value,
        country: document.getElementById('country').value,
        portfolio: document.getElementById('portfolio').value,
        coverLetter: document.getElementById('coverLetter').value,
        terms: document.querySelector('input[name="terms"]').checked
    };

    // Log form data (in a real application, this would be sent to a server)
    console.log('Application Submitted:', formData);

    // Show success message
    showSuccessMessage();

    // Reset form
    document.getElementById('applicationForm').reset();
}

// Show success message
function showSuccessMessage() {
    const form = document.getElementById('applicationForm');
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.innerHTML = `
        <div class="success-content">
            <h3>✓ Application Submitted Successfully!</h3>
            <p>Thank you for applying to KJScale. We'll review your application and get back to you shortly.</p>
            <p>Make sure to check your email for updates on your application status.</p>
        </div>
    `;

    form.parentNode.insertBefore(successMessage, form);

    // Add styles for success message
    const style = document.createElement('style');
    style.textContent = `
        .success-message {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
            animation: slideDown 0.5s ease;
        }

        .success-content h3 {
            color: #155724;
            margin-bottom: 10px;
        }

        .success-content p {
            color: #155724;
            margin-bottom: 8px;
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);

    // Remove success message after 5 seconds
    setTimeout(() => {
        successMessage.style.animation = 'slideUp 0.5s ease';
        setTimeout(() => {
            successMessage.remove();
        }, 500);
    }, 5000);
}

// Smooth scroll for FAQ items (if needed for future expansion)
document.addEventListener('DOMContentLoaded', function() {
    // Add any page load functionality here
    
    // Optional: Add FAQ accordion functionality
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        item.addEventListener('click', function() {
            // Future accordion functionality can be added here
        });
    });
});
