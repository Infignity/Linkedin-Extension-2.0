document.addEventListener('DOMContentLoaded', function () {
  const listForm = document.getElementById('listForm');
  const errorMessageContainer = document.getElementById('errorMessage');
  const submitBtn = document.getElementById('submitButton');

  // Initially hide the form and error message
  listForm.style.display = 'none';
  errorMessageContainer.style.display = 'none';

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const tab = tabs[0];
    if (isLinkedInURL(tab.url)) {
      // Show the form if the user is on LinkedIn
      listForm.style.display = 'block';

      // Hide the submit button initially
      submitBtn.style.display = 'none';

      listForm.addEventListener('input', function () {
        const listName = document.getElementById('listName').value.trim();
        
        // Show the submit button only if the listName is not empty
        if (listName) {
          submitBtn.style.display = 'block';
        } else {
          submitBtn.style.display = 'none';
        }
      });

      listForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const listName = document.getElementById('listName').value.trim();

        chrome.tabs.sendMessage(tab.id, { action: 'executeContentScript', listName });

        window.close(); 
      });
    } else {
      // Show an error message if the user is not on LinkedIn
      errorMessageContainer.style.display = 'block';
      errorMessageContainer.textContent = 'You are not on LinkedIn.';
    }
  });

  function isLinkedInURL(url) {
    return /^https:\/\/www\.linkedin\.com\//.test(url);
  }
});
