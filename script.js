/**
 * INTERNPILOT INTERACTION LOGIC (script.js)
 * Fully local application script handling cover letter creation, follow-ups,
 * application checklists, priority calculations, downloaders, copy-pastes,
 * and localStorage synchronization.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- State Variables ---
  let currentGeneratedData = null;
  let trackedApplications = [];

  // --- DOM Elements ---
  const appForm = document.getElementById('application-form');
  const userNameInput = document.getElementById('user-name');
  const userEmailInput = document.getElementById('user-email');
  const companyNameInput = document.getElementById('company-name');
  const internRoleInput = document.getElementById('intern-role');
  const userSkillsInput = document.getElementById('user-skills');
  const jobTypeSelect = document.getElementById('job-type');
  const jobStipendInput = document.getElementById('job-stipend');
  const deadlineInput = document.getElementById('application-deadline');
  const userIntroInput = document.getElementById('user-intro');

  const generateBtn = document.getElementById('generate-btn');
  const resetBtn = document.getElementById('reset-btn');

  // Tabs and Panels
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  // Outputs
  const clOutput = document.getElementById('cover-letter-output');
  const fuOutput = document.getElementById('follow-up-output');
  const priorityScoreBadge = document.getElementById('priority-score');
  const priorityScoreDesc = document.getElementById('priority-score-desc');
  const checklistOutput = document.getElementById('checklist-output');

  // Actions
  const copyClBtn = document.getElementById('copy-cl-btn');
  const downloadClBtn = document.getElementById('download-cl-btn');
  const copyFuBtn = document.getElementById('copy-fu-btn');
  const downloadFuBtn = document.getElementById('download-fu-btn');
  const saveTrackerBtn = document.getElementById('save-tracker-btn');
  const clearAllTrackerBtn = document.getElementById('clear-all-tracker-btn');

  // Tracker Grid
  const trackerGrid = document.getElementById('tracker-grid');
  const trackerEmptyState = document.getElementById('tracker-empty');

  // Toast
  const toastNotification = document.getElementById('toast-notification');
  const toastMessage = document.getElementById('toast-message');

  // --- Initialization ---
  loadTrackedApplications();
  setDefaultDeadlineDate();

  // --- Tab Switching Logic ---
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTabId = button.getAttribute('data-tab');
      
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanels.forEach(panel => panel.classList.remove('active'));

      button.classList.add('active');
      document.getElementById(targetTabId).classList.add('active');
    });
  });

  // --- Helper: Set Default Date (14 days from today) ---
  function setDefaultDeadlineDate() {
    const today = new Date();
    today.setDate(today.getDate() + 14);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    deadlineInput.value = `${yyyy}-${mm}-${dd}`;
  }

  // --- Toast Notification ---
  function showToast(message, isSuccess = true) {
    toastMessage.textContent = message;
    
    // Icon change depending on context
    const icon = toastNotification.querySelector('.toast-icon i');
    if (isSuccess) {
      toastNotification.style.background = 'hsl(142, 70%, 12%)';
      toastNotification.style.borderColor = 'var(--color-success)';
      icon.className = 'fa-solid fa-circle-check';
      icon.style.color = 'var(--color-success)';
    } else {
      toastNotification.style.background = 'hsl(356, 75%, 12%)';
      toastNotification.style.borderColor = 'var(--color-danger)';
      icon.className = 'fa-solid fa-triangle-exclamation';
      icon.style.color = 'var(--color-danger)';
    }

    toastNotification.classList.remove('hidden');
    toastNotification.style.opacity = '1';
    toastNotification.style.transform = 'translateY(0)';

    setTimeout(() => {
      toastNotification.style.opacity = '0';
      toastNotification.style.transform = 'translateY(20px)';
      setTimeout(() => {
        toastNotification.classList.add('hidden');
      }, 300);
    }, 2500);
  }

  // --- Generator Algorithms ---
  appForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Extract Form Values
    const name = userNameInput.value.trim();
    const email = userEmailInput.value.trim();
    const company = companyNameInput.value.trim();
    const role = internRoleInput.value.trim();
    const skillsText = userSkillsInput.value.trim();
    const jobType = jobTypeSelect.value;
    const stipend = jobStipendInput.value.trim() || 'Not specified';
    const deadlineVal = deadlineInput.value;
    const intro = userIntroInput.value.trim();

    const skillsArray = skillsText ? skillsText.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];

    // Calculate Priority Score & Urgency
    const deadlineDate = new Date(deadlineVal);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // normalize today to date-only
    deadlineDate.setHours(0, 0, 0, 0);

    const timeDiff = deadlineDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

    let priority = 'Low';
    let priorityClass = 'badge-low';
    let pDescription = '';

    if (daysRemaining < 0) {
      priority = 'High';
      priorityClass = 'badge-high';
      pDescription = `Overdue by ${Math.abs(daysRemaining)} days! Apply immediately.`;
    } else if (daysRemaining <= 3) {
      priority = 'High';
      priorityClass = 'badge-high';
      pDescription = `Critical: Only ${daysRemaining} days remaining until deadline. Apply as soon as possible.`;
    } else if (daysRemaining <= 8) {
      priority = 'Medium';
      priorityClass = 'badge-medium';
      pDescription = `Moderate: ${daysRemaining} days remaining. Plan to submit your application this week.`;
    } else {
      priority = 'Low';
      priorityClass = 'badge-low';
      pDescription = `Relax: ${daysRemaining} days remaining. You have plenty of time to refine your application.`;
    }

    // Cover Letter Template Generation
    const coverLetter = generateCoverLetterText(name, email, company, role, skillsArray, jobType, intro);
    clOutput.textContent = coverLetter;

    // Follow-up Template Generation
    const followUp = generateFollowUpText(name, email, company, role, skillsArray, deadlineVal);
    fuOutput.textContent = followUp;

    // Priority Score update UI
    priorityScoreBadge.textContent = priority;
    priorityScoreBadge.className = `score-badge ${priorityClass}`;
    priorityScoreDesc.textContent = pDescription;

    // Checklist Generation
    generateChecklistUI(company, role, jobType, skillsArray, deadlineVal, priority);

    // Save state for tracker action
    currentGeneratedData = {
      name,
      email,
      company,
      role,
      skills: skillsArray,
      jobType,
      stipend,
      deadline: deadlineVal,
      priority,
      intro,
      coverLetter,
      followUp
    };

    // Enable application tracker save button
    saveTrackerBtn.disabled = false;

    // Visual feedback
    showToast('Materials generated successfully!');
    
    // Automatically switch to first tab
    document.querySelector('[data-tab="tab-cl"]').click();
  });

  // --- Reset Form & Workspace ---
  resetBtn.addEventListener('click', () => {
    appForm.reset();
    setDefaultDeadlineDate();
    currentGeneratedData = null;
    
    // Clear outputs to placeholders
    clOutput.textContent = 'Fill in your Application Details on the left and click "Generate Materials" to view your customized cover letter.';
    fuOutput.textContent = 'Follow-up message will appear here after generation. Use this to contact recruiters via LinkedIn or email.';
    
    priorityScoreBadge.textContent = 'Pending';
    priorityScoreBadge.className = 'score-badge badge-neutral';
    priorityScoreDesc.textContent = 'Calculated automatically based on your application deadline.';
    
    checklistOutput.innerHTML = '<li class="checklist-placeholder"><i class="fa-regular fa-circle-question"></i> Generate materials to create a custom checklist.</li>';
    
    saveTrackerBtn.disabled = true;
    showToast('Form and output reset', true);
  });

  // --- Custom Cover Letter Generator Logic ---
  function generateCoverLetterText(name, email, company, role, skills, jobType, intro) {
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const skillPhrase = skills.length > 0
      ? `My technical skillset, including proficiency in ${skills.slice(0, -1).join(', ')}${skills.length > 1 ? ', and ' : ''}${skills[skills.length - 1]},`
      : 'My technical background, passion for project execution, and adaptability';

    const hook = intro 
      ? intro 
      : `I have been following ${company}'s industry impact, and I am excited about the prospect of contributing to your forward-thinking projects.`;

    return `${name}
${email}
${today}

Hiring Committee / Recruiting Team
${company}

Subject: Application for ${role} (${jobType})

Dear Hiring Team at ${company},

I am writing to express my strong enthusiasm for the ${role} internship opportunity at ${company}. ${hook} As a motivated candidate seeking to apply my skills in a fast-paced environment, I am confident that this position aligns perfectly with my professional goals and training.

${skillPhrase} makes me a strong fit for the responsibilities outlined in the job description. Throughout my studies and personal projects, I have consistently focused on building reliable, clean systems and collaborating effectively in team settings. I am particularly drawn to ${company} because of your commitment to excellence, and I am excited about the chance to bring my fresh perspective and dedicated work ethic to your team.

This ${jobType} internship will allow me to integrate my theoretical knowledge with hands-on projects, specifically contributing to your current milestones. I am eager to learn from your talented engineers and professionals while delivering measurable value.

Thank you for your time and consideration. I would welcome the opportunity to discuss my application further in an interview. I have attached my resume for your review and look forward to hearing from you.

Sincerely,

${name}
${email}`;
  }

  // --- Custom Follow-up Generator Logic ---
  function generateFollowUpText(name, email, company, role, skills, deadline) {
    const formattedDeadline = new Date(deadline).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const skillsContext = skills.length > 0 
      ? ` My skills in ${skills.slice(0, 3).join(', ')} align closely with your requirements, and I am ready to jump in immediately.`
      : '';

    return `Subject: Follow-up: Application for ${role} at ${company} - ${name}

Dear Recruiting Team / Hiring Manager,

I hope you are having a wonderful week.

I am writing to briefly follow up on the application I submitted for the ${role} position at ${company}. Having submitted my details ahead of the ${formattedDeadline} deadline, I wanted to reiterate my enthusiastic interest in this opportunity.

${company} remains one of my top choices for an internship. ${skillsContext} I am confident that my work ethic and background will make a positive impact on your department's goals.

Please let me know if there are any further documents, portfolios, or references I can provide to support my application. I look forward to the possibility of discussing how I can contribute to your team.

Thank you once again for your time and consideration.

Best regards,

${name}
${email}`;
  }

  // --- Checklist Builder Logic ---
  function generateChecklistUI(company, role, jobType, skills, deadline, priority) {
    checklistOutput.innerHTML = ''; // Clear placeholder
    
    const formattedDeadline = new Date(deadline).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const checklistItems = [
      { id: 'chk-resume', label: `Tailor resume highlights for ${role} (highlight skills like: ${skills.length > 0 ? skills.slice(0, 3).join(', ') : 'core skills'})` },
      { id: 'chk-cl', label: `Review and customize the generated cover letter for ${company}` },
      { id: 'chk-portfolio', label: `Ensure LinkedIn and GitHub profiles showcase project work relevant to ${role}` },
      { id: 'chk-submit', label: `Submit application on company portal before ${formattedDeadline} (${priority} Priority)` }
    ];

    // Job type specific tasks
    if (jobType === 'Remote') {
      checklistItems.push({ id: 'chk-remote', label: 'Verify home office setup, stable internet connection, and professional video backdrop' });
    } else if (jobType === 'Hybrid' || jobType === 'On-site') {
      checklistItems.push({ id: 'chk-commute', label: `Research commute options and travel logistics for ${company}'s office` });
    }

    checklistItems.push(
      { id: 'chk-network', label: `Find and connect with 1-2 team members or recruiters from ${company} on LinkedIn` },
      { id: 'chk-fu', label: 'Draft follow-up email/message (Ready! Set calendar reminder to send 7 days post-apply)' },
      { id: 'chk-prep', label: `Practice standard behavior & coding/technical interview questions for a ${role} position` }
    );

    checklistItems.forEach((item, index) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <label class="checklist-item" for="${item.id}-${index}">
          <input type="checkbox" id="${item.id}-${index}">
          <span class="checkbox-custom"></span>
          <span class="checklist-label">${item.label}</span>
        </label>
      `;
      checklistOutput.appendChild(li);
    });
  }

  // --- Copy to Clipboard Utility ---
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
      .then(() => {
        showToast('Copied to clipboard!', true);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        showToast('Failed to copy text', false);
      });
  }

  copyClBtn.addEventListener('click', () => {
    // Read directly from output in case the user edited it
    const text = clOutput.textContent;
    if (text.startsWith('Fill in your Application')) {
      showToast('No cover letter generated yet!', false);
      return;
    }
    copyToClipboard(text);
  });

  copyFuBtn.addEventListener('click', () => {
    const text = fuOutput.textContent;
    if (text.startsWith('Follow-up message will')) {
      showToast('No follow-up message generated yet!', false);
      return;
    }
    copyToClipboard(text);
  });

  // --- Download as Text File Utility ---
  function downloadTextFile(filename, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`, true);
  }

  downloadClBtn.addEventListener('click', () => {
    const text = clOutput.textContent;
    if (text.startsWith('Fill in your Application')) {
      showToast('No cover letter generated yet!', false);
      return;
    }
    const company = companyNameInput.value.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${company}_cover_letter.txt`;
    downloadTextFile(filename, text);
  });

  downloadFuBtn.addEventListener('click', () => {
    const text = fuOutput.textContent;
    if (text.startsWith('Follow-up message will')) {
      showToast('No follow-up message generated yet!', false);
      return;
    }
    const company = companyNameInput.value.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${company}_follow_up.txt`;
    downloadTextFile(filename, text);
  });

  // --- LocalStorage Application Tracker Management ---
  function loadTrackedApplications() {
    const saved = localStorage.getItem('internpilot_applications');
    if (saved) {
      try {
        trackedApplications = JSON.parse(saved);
      } catch (e) {
        trackedApplications = [];
        console.error('Error parsing application tracker local storage data:', e);
      }
    } else {
      trackedApplications = [];
    }
    renderTrackerGrid();
  }

  function saveTrackedApplicationsToStorage() {
    localStorage.setItem('internpilot_applications', JSON.stringify(trackedApplications));
    renderTrackerGrid();
  }

  saveTrackerBtn.addEventListener('click', () => {
    if (!currentGeneratedData) return;

    // Check if company + role already exists to prevent duplicate clicks
    const duplicate = trackedApplications.some(app => 
      app.company.toLowerCase() === currentGeneratedData.company.toLowerCase() && 
      app.role.toLowerCase() === currentGeneratedData.role.toLowerCase()
    );

    if (duplicate) {
      showToast('This application is already being tracked!', false);
      return;
    }

    // Add unique ID and timestamp
    const newApp = {
      ...currentGeneratedData,
      id: 'app-' + Date.now(),
      createdDate: new Date().toISOString()
    };

    trackedApplications.unshift(newApp); // Add to the top
    saveTrackedApplicationsToStorage();
    showToast('Saved to Applications Tracker!', true);
    
    // Scroll tracker section into view
    document.querySelector('.tracker-section').scrollIntoView({ behavior: 'smooth' });
  });

  // --- Render Applications in Grid ---
  function renderTrackerGrid() {
    // Clear all existing cards except empty state
    const cards = trackerGrid.querySelectorAll('.tracker-card');
    cards.forEach(card => card.remove());

    if (trackedApplications.length === 0) {
      trackerEmptyState.style.display = 'flex';
      clearAllTrackerBtn.style.display = 'none';
      return;
    }

    trackerEmptyState.style.display = 'none';
    clearAllTrackerBtn.style.display = 'inline-flex';

    trackedApplications.forEach(app => {
      const card = document.createElement('div');
      card.className = 'tracker-card';
      card.setAttribute('data-id', app.id);

      let prioClass = 't-prio-low';
      if (app.priority === 'High') prioClass = 't-prio-high';
      if (app.priority === 'Medium') prioClass = 't-prio-medium';

      const formattedDeadline = new Date(app.deadline).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      // Render details
      card.innerHTML = `
        <div class="t-card-header">
          <div class="t-company-group">
            <h4>${escapeHTML(app.company)}</h4>
            <p>${escapeHTML(app.role)}</p>
          </div>
          <span class="t-priority ${prioClass}">${app.priority}</span>
        </div>
        
        <div class="t-card-details">
          <div class="t-detail-item">
            <span>Job Type:</span>
            <span><strong>${app.jobType}</strong></span>
          </div>
          <div class="t-detail-item">
            <span>Stipend:</span>
            <span><strong>${escapeHTML(app.stipend)}</strong></span>
          </div>
          <div class="t-detail-item">
            <span>Deadline:</span>
            <span><strong>${formattedDeadline}</strong></span>
          </div>
          ${app.skills.length > 0 ? `
            <div class="t-skills-tags">
              ${app.skills.slice(0, 4).map(skill => `<span class="t-skill-tag">${escapeHTML(skill)}</span>`).join('')}
              ${app.skills.length > 4 ? `<span class="t-skill-tag">+${app.skills.length - 4} more</span>` : ''}
            </div>
          ` : ''}
        </div>
        
        <div class="t-card-actions">
          <button class="t-btn-delete" title="Delete Application" data-id="${app.id}">
            <i class="fa-solid fa-trash-can"></i>
          </button>
          <div class="t-card-retrievals">
            <button class="t-btn-retrieve t-btn-fill" data-id="${app.id}" title="Fill form with this data">
              <i class="fa-solid fa-pencil"></i> Edit Form
            </button>
            <button class="t-btn-retrieve t-btn-copy-cl" data-id="${app.id}" title="Copy saved cover letter">
              <i class="fa-regular fa-file-lines"></i> CL
            </button>
          </div>
        </div>
      `;

      // Attach event listeners to card elements
      card.querySelector('.t-btn-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteApplication(app.id);
      });

      card.querySelector('.t-btn-fill').addEventListener('click', (e) => {
        e.stopPropagation();
        fillFormWithData(app);
      });

      card.querySelector('.t-btn-copy-cl').addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(app.coverLetter);
      });

      trackerGrid.appendChild(card);
    });
  }

  // Delete Individual Application
  function deleteApplication(id) {
    if (confirm('Are you sure you want to delete this application from the tracker?')) {
      trackedApplications = trackedApplications.filter(app => app.id !== id);
      saveTrackedApplicationsToStorage();
      showToast('Application deleted', true);
    }
  }

  // Fill Form fields back with tracker item
  function fillFormWithData(app) {
    userNameInput.value = app.name;
    userEmailInput.value = app.email;
    companyNameInput.value = app.company;
    internRoleInput.value = app.role;
    userSkillsInput.value = app.skills.join(', ');
    jobTypeSelect.value = app.jobType;
    jobStipendInput.value = app.stipend === 'Not specified' ? '' : app.stipend;
    deadlineInput.value = app.deadline;
    userIntroInput.value = app.intro;

    // Simulate submission to regenerate cover letter and checklist properly
    generateBtn.click();
    showToast('Loaded details back into form. Edit and regenerate as needed!', true);
    
    // Smooth scroll up to form
    document.querySelector('.hero-section').scrollIntoView({ behavior: 'smooth' });
  }

  // Clear All Tracker Data
  clearAllTrackerBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete ALL tracked applications? This action cannot be undone.')) {
      trackedApplications = [];
      saveTrackedApplicationsToStorage();
      showToast('All tracked applications cleared', true);
    }
  });

  // Helper to prevent HTML injection in card render
  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }
});
