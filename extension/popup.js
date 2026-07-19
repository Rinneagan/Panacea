document.getElementById('saveBtn').addEventListener('click', async () => {
  const statusEl = document.getElementById('statusText');
  statusEl.innerText = 'Extracting data...';
  
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: scrapeJobData,
  }, (results) => {
    if (results && results[0] && results[0].result) {
      const data = results[0].result;
      statusEl.innerText = `Found: ${data.company || 'Unknown'} - ${data.role || 'Unknown'}`;
      
      setTimeout(() => {
        const url = `http://localhost:5173/jobs?auto_add=true&company=${encodeURIComponent(data.company)}&role=${encodeURIComponent(data.role)}&link=${encodeURIComponent(tab.url)}`;
        chrome.tabs.create({ url });
      }, 500);
    } else {
      statusEl.innerText = 'Failed to extract data.';
    }
  });
});

function scrapeJobData() {
  let company = '';
  let role = '';
  
  try {
    const url = window.location.href;
    
    // Greenhouse
    if (url.includes('boards.greenhouse.io')) {
      const compEl = document.querySelector('span.company-name');
      if (compEl) company = compEl.innerText.replace('at ', '').trim();
      const roleEl = document.querySelector('h1.app-title');
      if (roleEl) role = roleEl.innerText.trim();
    }
    // Lever
    else if (url.includes('jobs.lever.co')) {
      company = document.title.split('-')[0].trim();
      const roleEl = document.querySelector('h2');
      if (roleEl) role = roleEl.innerText.trim();
    }
    // LinkedIn
    else if (url.includes('linkedin.com/jobs')) {
      const compEl = document.querySelector('.job-details-jobs-unified-top-card__company-name');
      if (compEl) company = compEl.innerText.trim();
      const roleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title');
      if (roleEl) role = roleEl.innerText.trim();
    }
    
    // Fallback if specific parsers fail
    if (!company && !role) {
      const titleParts = document.title.split(' - ');
      if (titleParts.length > 1) {
        role = titleParts[0].trim();
        company = titleParts[1].trim();
      } else {
        company = document.title;
      }
    }
  } catch (e) {
    console.error(e);
  }
  
  return { company, role };
}
