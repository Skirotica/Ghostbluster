// content_script.js
(function () {
  // Extract commonly used fields for job postings (best-effort)
  function textOf(selector) {
    const el = document.querySelector(selector);
    return el ? el.innerText.trim() : "";
  }

  function findMeta() {
    const url = window.location.href;
    let title = "";
    let company = "";
    let postAge = ""; // human-readable (e.g., "3 days ago")
    let jd = "";

    // LinkedIn job
    if (/linkedin\.com\/jobs/.test(url)) {
      title = textOf('.topcard__title') || textOf('.jobs-unified-top-card__job-title');
      company = textOf('.topcard__org-name-link') || textOf('.jobs-unified-top-card__company-name');
      postAge = textOf('.posted-time-ago__text') || textOf('.jobs-unified-top-card__posted-time');
      // job description
      const desc = document.querySelector('.description__text') || document.querySelector('.show-more-less-html__markup');
      jd = desc ? desc.innerText.trim() : "";
    }

    // Indeed
    if (/indeed\.com\/rc\/viewjob/.test(url) || /indeed\.com\/viewjob/.test(url)) {
      title = textOf('h1.jobsearch-JobInfoHeader-title') || textOf('.jobsearch-JobInfoHeader-title');
      company = textOf('.jobsearch-InlineCompanyRating div') || textOf('.icl-u-lg-mr--sm.icl-u-xs-mr--xs');
      postAge = textOf('.jobsearch-JobMetadataFooter') || "";
      jd = textOf('#jobDescriptionText') || "";
    }

    // Glassdoor
    if (/glassdoor\.com\/Job/.test(url) || /glassdoor\.com\/job-listing/.test(url)) {
      title = textOf('.css-17x2pwl') || textOf('.jobDescriptionContent');
      company = textOf('.css-87uc0g') || textOf('.ctc-compact-company');
      postAge = textOf('.css-13etb6x') || "";
      jd = textOf('#JobDescriptionContainer') || "";
    }

    // Generic fallback
    if (!title) {
      const h1 = document.querySelector('h1');
      title = h1 ? h1.innerText.trim() : "";
    }
    if (!jd) {
      // Grab main article or main content
      const article = document.querySelector('article') || document.querySelector('main') || document.querySelector('section');
      jd = article ? article.innerText.trim() : document.body.innerText.slice(0, 4000);
    }

    return {
      title,
      company,
      postAge,
      jd,
      url
    };
  }

  // Provide a simple message handler to send the detected metadata
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request?.type === "EXTRACT_JOB") {
      sendResponse(findMeta());
    }
  });
})();
