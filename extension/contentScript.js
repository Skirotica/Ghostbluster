function extractLinkedIn() {
  const title = document.querySelector("h1.top-card-layout__title")?.innerText;
  const company = document.querySelector("a.topcard__org-name-link")?.innerText;
  const description = document.querySelector(".description__text")?.innerText;
  const posted = document.querySelector(".posted-time-ago__text")?.innerText;

  return { title, company, description, posted, platform: "LinkedIn" };
}

function extractIndeed() {
  const title = document.querySelector("#jobDescriptionText h1")?.innerText;
  const company = document.querySelector(".css-1h7lik5")?.innerText;
  const description = document.querySelector("#jobDescriptionText")?.innerText;

  return { title, company, description, platform: "Indeed" };
}

function detectSite() {
  const url = window.location.href;

  if (url.includes("linkedin.com/jobs")) return extractLinkedIn();
  if (url.includes("indeed.com/viewjob")) return extractIndeed();
  return null;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.command === "extractJob") {
    const data = detectSite();
    sendResponse({ data });
  }
});
