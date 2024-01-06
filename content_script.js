const STORAGE_KEY = 'exlinkedinCompanies';
let click = 2;
const maxpage = 5;
const scrollInterval = 2000;
const delayBeforeNextPage = 7000;
const loadPage = 7000;

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === "executeContentScript") {
        clearLocalStorage(STORAGE_KEY);
        blurPage();
        executeContentScript(message.listName);
    }
});

function executeContentScript(listName) {
    console.log('List Name:', listName);

    const resultsContainer = document.querySelector('#search-results-container');
    if (!resultsContainer) {
        console.log("Results container not found!");
        console.error("Results container not found!");
        removeBlur(listName);
        return;
    }

    const totalScrolls = document.querySelectorAll(".artdeco-list__item.pl3.pv3").length;
    console.log("Total Scrolls: ", totalScrolls);

    let scrollsCompleted = 0;

    function handleScroll() {
        resultsContainer.scrollBy(0, 250);
        console.log("Scrolled:", scrollsCompleted + 1, "times");

        scrollsCompleted++;

        if (scrollsCompleted === totalScrolls) {
            fetchLinkedinCompanies(listName);
        }
    }

    for (let i = 0; i < totalScrolls; i++) {
        setTimeout(handleScroll, i * scrollInterval + getRandomDelay());
    }
}

function fetchLinkedinCompanies(listName) {
    const companies = document.querySelectorAll('.artdeco-entity-lockup--size-4');

    const linkedinCompanies = Array.from(companies)
        .map(company => {
            const companyLink = company.querySelector('.artdeco-entity-lockup__title a')?.getAttribute('href');
            const companyName = company.querySelector('.artdeco-entity-lockup__title a')?.textContent.trim();
            const photoUrl = company.querySelector('.artdeco-entity-lockup__image img')?.getAttribute('src');
            const industry = company.querySelector('.artdeco-entity-lockup__subtitle span[data-anonymize="industry"]')?.textContent.trim();
            const employeesLink = company.querySelector('.artdeco-entity-lockup__subtitle a');
            const employeesCount = employeesLink?.textContent.trim();

            return {
                href: `https://www.linkedin.com${companyLink}`,
                name: companyName,
                photo_url: photoUrl,
                industry: industry,
                employees_count: employeesCount,
            };
        });

    console.log("LinkedIn companies captured:", linkedinCompanies);

    updateLocalStorage(linkedinCompanies);

    const nextPageButton = document.querySelector('.artdeco-pagination__button--next');

    function loadNextPage() {
        if (click < maxpage) {
            nextPageButton.click();
            setTimeout(() => {
                executeContentScript(listName);
                click++;
            }, loadPage);
            console.log("Page", click);
        } else {
            console.log("Reached Maximum Pages.");
            removeBlur(listName);
        }
    }

    if (nextPageButton && !nextPageButton.hasAttribute('disabled')) {
        setTimeout(loadNextPage, delayBeforeNextPage);
    } else {
        console.log("No more pages to load.");
        removeBlur(listName);
    }
}

function updateLocalStorage(data) {
    const existingData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const mergedData = JSON.stringify([...existingData, ...data]);
    localStorage.setItem(STORAGE_KEY, mergedData);
}

function getRandomDelay() {
    return Math.floor(Math.random() * 1000);
}

function blurPage() {
    showProcessingOverlay();
}

function clearLocalStorage(key) {
    if (localStorage.getItem(key)) {
        console.log(`Clearing ${key} from local storage.`);
        localStorage.removeItem(key);
    }
}

function showProcessingOverlay() {
    const processingOverlay = document.createElement('div');
    processingOverlay.classList.add('processing-overlay');

    const processingText = document.createElement('div');
    processingText.classList.add('processing-text');
    processingText.textContent = 'Processing...';

    processingOverlay.appendChild(processingText);
    document.body.appendChild(processingOverlay);
}

function hideProcessingOverlay() {
    const processingOverlay = document.querySelector('.processing-overlay');
    if (processingOverlay) {
        processingOverlay.remove();
    }
}

function removeBlur(listName) {
    const linkedinCompanies = JSON.parse(localStorage.getItem(STORAGE_KEY));
    console.log('Received data in background:', { listName, linkedinCompanies });

    saveDataToFile(linkedinCompanies, listName);
    hideProcessingOverlay();
}

function saveDataToFile(data, listName) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const timestamp = new Date().toISOString().replace(/[-:]/g, '');
    const filename = `${listName}_${timestamp}.json`;

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}
